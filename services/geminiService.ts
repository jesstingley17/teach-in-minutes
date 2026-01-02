
import { GoogleGenAI, Type } from "@google/genai";
import { Worksheet, QuestionType, ThemeType, DocumentType, AudienceCategory, LearnerProfile, Course } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export interface GenerationOptions {
  topic: string; 
  courseContext?: string; // Information about the overarching course
  educationalLevel: string;
  audienceCategory: AudienceCategory;
  learnerProfile: LearnerProfile;
  difficulty: string;
  language: string;
  documentType: DocumentType;
  questionCounts: Record<string, number>;
  rawText?: string;
  fileData?: { data: string; mimeType: string };
  isMathMode?: boolean;
}

/**
 * Parses a raw syllabus or course description into a structured Course object.
 */
export async function parseCourseOutline(
  fileData?: { data: string; mimeType: string },
  rawText?: string
): Promise<Course> {
  const parts: any[] = [];
  if (fileData) parts.push({ inlineData: { data: fileData.data, mimeType: fileData.mimeType } });
  
  const promptText = `
    ROLE: Academic Curriculum Architect.
    TASK: Analyze the provided syllabus/outline and create a structured Course object.
    
    INSTRUCTIONS:
    - Extract a professional Course Title.
    - Break down the content into 4-8 logical Modules.
    - For each Module, provide a short description and a list of specific Lessons/Topics.
    
    ${rawText ? `CONTEXT: ${rawText}` : ''}
    
    FORMAT: Return valid JSON matching the Course interface.
  `;
  
  parts.push({ text: promptText });

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: { parts },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          code: { type: Type.STRING },
          description: { type: Type.STRING },
          modules: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                topics: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ["id", "title", "topics"]
            }
          }
        },
        required: ["title", "description", "modules"]
      }
    }
  });

  const parsed = JSON.parse(response.text || '{}');
  return {
    ...parsed,
    id: Date.now().toString(),
    modules: parsed.modules.map((m: any) => ({ ...m, status: 'pending' }))
  };
}

export async function generateWorksheet(options: GenerationOptions): Promise<Worksheet> {
  const { 
    topic, courseContext, educationalLevel, audienceCategory, learnerProfile, 
    difficulty, language, documentType, questionCounts, 
    rawText, fileData, isMathMode = false
  } = options;

  const parts: any[] = [];
  if (fileData) parts.push({ inlineData: { data: fileData.data, mimeType: fileData.mimeType } });

  const promptText = `
    ROLE: Senior Academic Designer.
    TASK: Generate a high-quality ${documentType} in ${language}.
    
    CURRICULUM CONTEXT: ${courseContext || 'Standalone assessment'}
    SPECIFIC TOPIC: ${topic}
    
    LEARNER LEVEL: ${audienceCategory} - ${educationalLevel}
    LEARNER PROFILE: ${learnerProfile} (Adjust rigor and instructions accordingly)
    DIFFICULTY: ${difficulty}
    
    ${rawText ? `MATERIAL TO BASE QUESTIONS ON: ${rawText}` : ''}

    PEDAGOGICAL RULES:
    1. For ${learnerProfile === LearnerProfile.SPECIAL_ED ? 'IEP/Special Ed' : learnerProfile}, adjust vocabulary complexity.
    2. Use ${isMathMode ? 'LaTeX ($...$ or $$...$$)' : 'standard text'} for all notation.
    3. Ensure content matches the overarching course context if provided.
    
    COUNTS:
    ${Object.entries(questionCounts).map(([t, c]) => `- ${t}: ${c}`).join('\n')}

    FORMAT: Return JSON matching the Worksheet structure.
  `;
  
  parts.push({ text: promptText });

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: { parts },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          topic: { type: Type.STRING },
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
                isChallenge: { type: Type.BOOLEAN },
                points: { type: Type.NUMBER }
              },
              required: ["id", "type", "question", "correctAnswer"]
            }
          }
        },
        required: ["title", "topic", "questions"]
      }
    }
  });

  const worksheet = JSON.parse(response.text || '{}') as Worksheet;
  worksheet.documentType = documentType;
  return worksheet;
}

// Added generateDoodles to fix missing export error in HandwritingElements.tsx
/**
 * Generates thematic doodles using Gemini 2.5 Flash Image.
 */
export async function generateDoodles(topic: string, gradeLevel: string): Promise<string[]> {
  const prompt = `Create hand-drawn minimalist pencil sketches and decorative doodles for a school worksheet about "${topic}" for ${gradeLevel}. 
  Style: simple black ink line art on white background, academic, friendly, and clean. 
  Focus on small icons or diagrams that complement the topic.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [{ text: prompt }]
    }
  });

  const urls: string[] = [];
  if (response.candidates?.[0]?.content?.parts) {
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        urls.push(`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`);
      }
    }
  }
  
  return urls;
}
