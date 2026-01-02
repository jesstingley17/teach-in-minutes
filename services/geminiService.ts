
import { GoogleGenAI, Type } from "@google/genai";
import { Worksheet, QuestionType, DocumentType, AudienceCategory, LearnerProfile, CurriculumStandard, LayoutStyle, ContainerIntent } from "../types.ts";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export interface LessonStructure {
  title: string;
  summary: string;
  suggestedQuestions: string[];
}

export interface GenerationOptions {
  topic: string; 
  educationalLevel: string;
  audienceCategory: AudienceCategory;
  language: string;
  containerIntents: ContainerIntent[];
  rawText?: string;
  fileData?: { data: string; mimeType: string };
  curriculumStandard?: CurriculumStandard;
}

/**
 * The "Right" Analysis Logic:
 * Uses gemini-3-pro-preview with Thinking Budget to ensure large documents 
 * are correctly decomposed into lessons without failing or skipping chapters.
 */
export async function analyzeCurriculum(source: { text?: string; file?: { data: string; mimeType: string } }): Promise<LessonStructure[]> {
  const ai = getAI();
  const parts: any[] = [];
  
  if (source.file) {
    parts.push({ 
      inlineData: { 
        data: source.file.data, 
        mimeType: source.file.mimeType 
      } 
    });
  }

  const prompt = `
    ROLE: Academic Curriculum Architect.
    
    TASK: Analyze the provided educational material (syllabus, notes, or chapter).
    Identify every distinct instructional unit or lesson. 
    
    RULES:
    1. Do not skip any chapters or sections.
    2. Extract the core objective for each unit.
    3. Identify 3 key questions that probe deep understanding for each unit.
    
    OUTPUT: Return a JSON array of lesson objects. 
    Ensure the JSON is valid and comprehensive.
  `;
  
  if (source.text) {
    parts.push({ text: `Source Material Text: ${source.text}` });
  }
  parts.push({ text: prompt });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: { parts },
      config: {
        thinkingConfig: { thinkingBudget: 2000 },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              summary: { type: Type.STRING },
              suggestedQuestions: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["title", "summary"]
          }
        }
      }
    });

    const text = response.text || '[]';
    // Deep clean in case of unexpected wrappers
    const cleanedJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const result = JSON.parse(cleanedJson);
    return Array.isArray(result) ? result : [];
  } catch (error) {
    console.error("Master Curriculum Scan Failure:", error);
    return [];
  }
}

export async function generateDoodles(topic: string, gradeLevel: string): Promise<string[]> {
  const ai = getAI();
  const prompt = `Minimalist black and white line art icons for ${topic} education at ${gradeLevel} level.`;
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: prompt }] },
      config: { imageConfig: { aspectRatio: "1:1" } }
    });

    const imageUrls: string[] = [];
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          imageUrls.push(`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`);
        }
      }
    }
    return imageUrls;
  } catch (error) {
    return [];
  }
}

export async function generateWorksheet(options: GenerationOptions): Promise<Worksheet[]> {
  const { 
    topic, educationalLevel, audienceCategory, 
    language, containerIntents, 
    rawText, fileData,
    curriculumStandard = CurriculumStandard.NONE
  } = options;

  const parts: any[] = [];
  if (fileData) {
    parts.push({ inlineData: { data: fileData.data, mimeType: fileData.mimeType } });
  }

  const promptText = `
    GENERATE ${containerIntents.length} UNIQUE ACADEMIC UNITS.
    
    SUBJECT: ${topic}
    LEVEL: ${educationalLevel}
    AUDIENCE: ${audienceCategory}
    CONTEXT: ${rawText || 'Standard curriculum'}
    
    MAPPING:
    ${containerIntents.map((intent, i) => `
    UNIT ${i+1}:
    - FOCUS: ${intent.specificInstructions}
    - DEPTH: ${intent.depth}
    - STRUCTURE: ${Object.entries(intent.questionCounts).map(([t, c]) => `${c}x ${t}`).join(', ')}
    `).join('\n')}

    Format math with '$'. Return a JSON ARRAY of Worksheet objects.
  `;
  
  parts.push({ text: promptText });

  const schema = {
    title: { type: Type.STRING },
    teachingContent: { type: Type.STRING },
    keyTakeaways: { type: Type.ARRAY, items: { type: Type.STRING } },
    documentType: { type: Type.STRING, enum: Object.values(DocumentType) },
    questions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          type: { type: Type.STRING, enum: Object.values(QuestionType) },
          question: { type: Type.STRING },
          options: { type: Type.ARRAY, items: { type: Type.STRING } },
          correctAnswer: { type: Type.STRING },
          explanation: { type: Type.STRING },
          points: { type: Type.NUMBER }
        },
        required: ["id", "type", "question", "correctAnswer", "points"]
      }
    }
  };

  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview", 
      contents: { parts },
      config: {
        thinkingConfig: { thinkingBudget: 4000 },
        responseMimeType: "application/json",
        responseSchema: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: schema, required: ["title", "questions"] } }
      }
    });

    const parsed = JSON.parse(response.text || '[]');
    return parsed.map((ws: any, i: number) => ({
      ...ws,
      topic,
      educationalLevel,
      audienceCategory,
      curriculumStandard,
      learnerProfile: containerIntents[i].profile,
      visualMetadata: { layoutStyle: containerIntents[i].layout }
    })) as Worksheet[];
  } catch (error: any) { 
    console.error("Generation Error:", error);
    throw error; 
  }
}
