
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
 * Uses gemini-3-flash-preview for high-speed, accurate structural mapping.
 */
export async function analyzeCurriculum(source: { text?: string; file?: { data: string; mimeType: string } }): Promise<LessonStructure[]> {
  const ai = getAI();
  const parts: any[] = [];
  
  if (source.file) {
    parts.push({ inlineData: { data: source.file.data, mimeType: source.file.mimeType } });
  }

  const prompt = `
    Analyze this educational document (textbook chapter, syllabus, or course notes). 
    Break it down into a logical sequence of distinct lessons or modules.
    
    CRITICAL RULES:
    1. Identify every unique topic that warrants a separate quiz or homework.
    2. If the document has numbered chapters or sections, use those.
    3. If it's a dense text, segment it into coherent learning units.
    
    For each unit identified, provide:
    - title: A short, descriptive name for the lesson.
    - summary: A 2-3 sentence overview of the core instructional objectives.
    - suggestedQuestions: A few key concepts that should be tested.
    
    Return a JSON array of these units. Ensure you find at least as many lessons as are explicitly defined in the document structure.
  `;
  
  if (source.text) {
    parts.push({ text: `Source Text Context: ${source.text}` });
  }
  parts.push({ text: prompt });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts },
      config: {
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

    const result = JSON.parse(response.text || '[]');
    return Array.isArray(result) ? result : [];
  } catch (error) {
    console.error("Curriculum Analysis Failed:", error);
    // Return an empty array so the UI can handle the failure gracefully
    return [];
  }
}

export async function generateDoodles(topic: string, gradeLevel: string): Promise<string[]> {
  const ai = getAI();
  const prompt = `Create a set of simple, minimalist black and white line-art sketches that a teacher might draw on a worksheet for ${gradeLevel} students about the topic: ${topic}. These should be educational icons or symbols.`;
  
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
    console.error("Doodle Generation Failure:", error);
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
    ROLE: Academic Architect.
    TASK: Generate EXACTLY ${containerIntents.length} unique educational units for: "${topic}".
    
    STRICT MAPPING REQUIREMENT:
    You are generating a sequence of units. Each unit corresponds to a specific part of the curriculum.
    Do NOT duplicate content between units. Use the 'specificInstructions' field for each unit to determine its boundaries.
    
    GLOBAL PARAMETERS:
    - SUBJECT: ${topic}
    - GRADE LEVEL: ${educationalLevel}
    - AUDIENCE: ${audienceCategory}
    - LANGUAGE: ${language}
    ${rawText ? `- CONTEXTUAL CONTENT: ${rawText}` : ''}
    
    FORMATTING:
    - Use KaTeX/MathJax formatting for all equations. Wrap symbols in '$'. Example: $\\sum_{i=1}^{n} i$.
    
    SUITE ARCHITECTURE:
    ${containerIntents.map((intent, i) => `
    UNIT ${i+1}:
    - TYPE: ${intent.type}
    - FOCUS: ${intent.specificInstructions || 'Complete coverage'}
    - DEPTH: ${intent.depth}
    - PROFILE: ${intent.profile}
    - LAYOUT: ${intent.layout}
    - QUESTIONS: ${Object.entries(intent.questionCounts).map(([t, c]) => `${c}x ${t}`).join(', ')}
    `).join('\n')}

    Return a JSON ARRAY of ${containerIntents.length} Worksheet objects.
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
    console.error("Worksheet Generation Error:", error);
    throw error; 
  }
}
