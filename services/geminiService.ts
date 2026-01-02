
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
 * Analyzes uploaded content to identify the underlying lesson structure.
 * Upgraded to Gemini 3 Pro with Thinking Budget for maximum structural accuracy.
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
    ROLE: Academic Syllabus Auditor & Curriculum Engineer.
    
    TASK: Perform a deep structural audit of the provided material. 
    You must extract EVERY distinct instructional unit, chapter, or lesson.
    
    STRICT REQUIREMENTS:
    1. If the document lists chapters (e.g., "Chapter 1", "Section 2.3"), extract them precisely.
    2. If the document is raw text/notes, identify the thematic shifts where a new lesson begins.
    3. You MUST generate at least one unit for every logically distinct topic found.
    4. Provide a pedagogically sound title and a 3-sentence objective for each.
    
    OUTPUT: A JSON array of lesson objects. Do not omit any detected sections.
  `;
  
  if (source.text) {
    parts.push({ text: `Source Context: ${source.text}` });
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
    // Clean potential markdown artifacts if they exist (though responseMimeType should handle it)
    const cleanedJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const result = JSON.parse(cleanedJson);
    return Array.isArray(result) ? result : [];
  } catch (error) {
    console.error("Deep Curriculum Analysis Failed:", error);
    return [];
  }
}

export async function generateDoodles(topic: string, gradeLevel: string): Promise<string[]> {
  const ai = getAI();
  const prompt = `Simple minimalist line-art sketches of educational icons for ${topic} at ${gradeLevel} level. Black and white.`;
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: prompt }]
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1"
        }
      }
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
    TASK: Materialize ${containerIntents.length} distinct educational instruments.
    
    CURRICULUM MAPPING:
    Each unit below is a separate 'node' in the course. 
    Strictly follow the 'FOCUS' instructions for each node to ensure 100% coverage without overlap.
    
    SUBJECT: ${topic}
    LEVEL: ${educationalLevel}
    AUDIENCE: ${audienceCategory}
    ${rawText ? `ANCHOR CONTENT: ${rawText}` : ''}
    
    UNITS TO GENERATE:
    ${containerIntents.map((intent, i) => `
    [UNIT ${i+1}]
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
    console.error("Master Suite Synthesis Error:", error);
    throw error; 
  }
}
