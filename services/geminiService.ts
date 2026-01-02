
import { GoogleGenAI, Type } from "@google/genai";
import { Worksheet, QuestionType, DocumentType, AudienceCategory, LearnerProfile, CurriculumStandard, LayoutStyle, ContainerIntent } from "../types";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

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
    ROLE: Senior Academic Architect.
    TASK: Construct a bespoke instructional suite for the topic: "${topic}".
    
    COLLECTION PARAMETERS:
    - EDUCATIONAL LEVEL: ${educationalLevel}
    - AUDIENCE: ${audienceCategory}
    - LANGUAGE: ${language}
    - TOPIC: ${topic}
    ${rawText ? `- CONTEXT: ${rawText}` : ''}
    
    GENERATE EXACTLY ${containerIntents.length} DOCUMENTS IN AN ARRAY.
    
    SPECIFIC PER-DOCUMENT REQUIREMENTS:
    ${containerIntents.map((intent, i) => `
    [DOCUMENT ${i+1}]
    - CATEGORY: ${intent.type}
    - PROFILE: ${intent.profile} (Modify vocabulary and complexity for this learner profile)
    - DEPTH: ${intent.depth} (Bloom's Taxonomy target)
    - LAYOUT: ${intent.layout}
    - QUESTIONS NEEDED: ${Object.entries(intent.questionCounts).map(([type, count]) => `${count}x ${type}`).join(', ')}
    - UNIQUE NOTES: ${intent.specificInstructions || 'None'}
    `).join('\n')}

    FORMATTING:
    - If LAYOUT is LAID_TEACH, generate 'teachingContent' (comprehensive mini-lesson) and 'keyTakeaways'.
    - MATH: Use $...$ for equations.
    - OUTPUT: JSON ARRAY matching the schema.
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
    console.error("AI Suite Generation Error:", error);
    throw error; 
  }
}

export async function generateDoodles(topic: string, gradeLevel: string): Promise<string[]> {
  const ai = getAI();
  const prompt = `Minimalist, high-contrast, black and white line art doodles for ${topic} at ${gradeLevel} level. Clear edges, printable.`;
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { parts: [{ text: prompt }] },
    config: { imageConfig: { aspectRatio: "1:1" } },
  });

  const doodles: string[] = [];
  if (response.candidates?.[0]?.content?.parts) {
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        doodles.push(`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`);
      }
    }
  }
  return doodles;
}
