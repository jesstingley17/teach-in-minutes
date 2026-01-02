
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Worksheet, QuestionType, DocumentType, AudienceCategory, LearnerProfile, CurriculumStandard, GroundingSource, LayoutStyle, AestheticMode } from "../types";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export interface ContainerIntent {
  type: DocumentType;
  profile: LearnerProfile;
  layout: LayoutStyle;
}

export interface GenerationOptions {
  topic: string; 
  educationalLevel: string;
  audienceCategory: AudienceCategory;
  difficulty: string;
  language: string;
  containerIntents: ContainerIntent[]; // Replaced simple bulkCount with rich intents
  rawText?: string;
  fileData?: { data: string; mimeType: string };
  isMathMode?: boolean;
  useGrounding?: boolean;
  curriculumStandard?: CurriculumStandard;
}

export async function generateWorksheet(options: GenerationOptions): Promise<Worksheet[]> {
  const { 
    topic, educationalLevel, audienceCategory, 
    difficulty, language, containerIntents, 
    rawText, fileData, isMathMode = false, useGrounding = false,
    curriculumStandard = CurriculumStandard.NONE
  } = options;

  const parts: any[] = [];
  
  if (fileData) {
    parts.push({ inlineData: { data: fileData.data, mimeType: fileData.mimeType } });
  }

  const persona = "High-End Academic Architect and Educational Content Engineer.";

  const promptText = `
    ROLE: ${persona}
    TASK: Generate a custom instructional suite for the topic: "${topic}".
    
    CORE REQUIREMENT:
    Generate exactly ${containerIntents.length} distinct documents.
    
    DOCUMENT SPECIFICATIONS:
    ${containerIntents.map((intent, i) => `
    CONTAINER #${i+1}:
    - DOCUMENT TYPE: ${intent.type}
    - LEARNER PROFILE: ${intent.profile} (SCAFFOLD ACCORDINGLY)
    - LAYOUT STYLE: ${intent.layout}
    `).join('\n')}

    SHARED PARAMETERS:
    - EDUCATIONAL LEVEL: ${educationalLevel}
    - RIGOR: ${difficulty}
    - LANGUAGE: ${language}
    - TOPIC: ${topic}
    ${rawText ? `- CONTEXT: ${rawText}` : ''}
    
    FORMATTING RULES:
    - For LAYOUT_STYLE: LAID_TEACH, always include 'teachingContent' (2-3 paragraphs) and 'keyTakeaways' (3-5 bullets).
    - For LAYOUT_STYLE: CLASSIC or ARCHITECT, keep teachingContent brief or focused on instructions.
    - MATH: Use $...$ for all symbols and equations.
    
    OUTPUT: RETURN AN ARRAY OF ${containerIntents.length} OBJECTS.
  `;
  
  parts.push({ text: promptText });

  const tools: any[] = [];
  if (useGrounding) tools.push({ googleSearch: {} });

  const schema = {
    title: { type: Type.STRING },
    topic: { type: Type.STRING },
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
        tools,
        responseMimeType: "application/json",
        responseSchema: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: schema, required: ["title", "questions"] } }
      }
    });

    const parsed = JSON.parse(response.text || '[]');
    return parsed.map((ws: any, i: number) => ({
      ...ws,
      curriculumStandard,
      learnerProfile: containerIntents[i].profile,
      visualMetadata: { layoutStyle: containerIntents[i].layout }
    })) as Worksheet[];
  } catch (error: any) { 
    console.error("AI Generation Error:", error);
    throw error; 
  }
}

export async function generateDoodles(topic: string, gradeLevel: string): Promise<string[]> {
  const ai = getAI();
  const prompt = `Hand-drawn, sketchy, minimalist educational doodles about ${topic} for grade ${gradeLevel}. Black and white line art, white background, simple icons.`;
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        {
          text: prompt,
        },
      ],
    },
    config: {
      imageConfig: {
        aspectRatio: "1:1"
      }
    },
  });

  const doodles: string[] = [];
  if (response.candidates && response.candidates[0] && response.candidates[0].content.parts) {
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        const base64Data: string = part.inlineData.data;
        const mimeType = part.inlineData.mimeType || 'image/png';
        doodles.push(`data:${mimeType};base64,${base64Data}`);
      }
    }
  }
  
  return doodles;
}
