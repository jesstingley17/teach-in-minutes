
import { GoogleGenAI, Type } from "@google/genai";
// Removed the non-existent 'Course' member from the types import
import { Worksheet, QuestionType, ThemeType, DocumentType, AudienceCategory, LearnerProfile, AssessmentBlueprint, CurriculumStandard, GroundingSource } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export interface GenerationOptions {
  topic: string; 
  courseContext?: string;
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
  useGrounding?: boolean;
  curriculumStandard?: CurriculumStandard;
}

export async function generateWorksheet(options: GenerationOptions): Promise<Worksheet> {
  const { 
    topic, courseContext, educationalLevel, audienceCategory, learnerProfile, 
    difficulty, language, documentType, questionCounts, 
    rawText, fileData, isMathMode = false, useGrounding = false,
    curriculumStandard = CurriculumStandard.NONE
  } = options;

  const parts: any[] = [];
  if (fileData) parts.push({ inlineData: { data: fileData.data, mimeType: fileData.mimeType } });

  const promptText = `
    ROLE: Senior Academic Designer & Curriculum Specialist.
    TASK: Generate a high-quality ${documentType} in ${language}.
    
    STANDARDS ALIGNMENT: Strictly align content to ${curriculumStandard === CurriculumStandard.NONE ? 'General Academic Standards' : curriculumStandard} learning objectives for ${audienceCategory} - ${educationalLevel}.
    
    CURRICULUM CONTEXT: ${courseContext || 'Standalone assessment'}
    SPECIFIC TOPIC: ${topic}
    
    LEARNER LEVEL: ${audienceCategory} - ${educationalLevel}
    LEARNER PROFILE: ${learnerProfile} (Adjust rigor and instructions accordingly)
    DIFFICULTY: ${difficulty}
    
    ${rawText ? `MATERIAL TO BASE QUESTIONS ON: ${rawText}` : ''}

    PEDAGOGICAL RULES:
    1. For ${learnerProfile === LearnerProfile.SPECIAL_ED ? 'IEP/Special Ed' : learnerProfile}, adjust vocabulary complexity.
    2. USE LaTeX for all math. Fractions MUST be in $\\frac{a}{b}$ format. Math MUST be wrapped in $...$ delimiters.
    3. CRITICAL: For every single question, provide a 'sectionInstruction'.
    4. Provide a 'standardReference' string (e.g., "CCSS.ELA-LITERACY.RI.9-10.1") that maps to the primary objective of this worksheet.
    
    COUNTS:
    ${Object.entries(questionCounts).map(([t, c]) => `- ${t}: ${c}`).join('\n')}

    FORMAT: Return JSON matching the Worksheet structure.
  `;
  
  parts.push({ text: promptText });

  const tools: any[] = [];
  if (useGrounding) {
    tools.push({ googleSearch: {} });
  }

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: { parts },
    config: {
      tools,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          topic: { type: Type.STRING },
          standardReference: { type: Type.STRING },
          questions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                type: { type: Type.STRING, enum: Object.values(QuestionType) },
                sectionInstruction: { type: Type.STRING },
                question: { type: Type.STRING },
                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                correctAnswer: { type: Type.STRING },
                explanation: { type: Type.STRING },
                isChallenge: { type: Type.BOOLEAN },
                points: { type: Type.NUMBER }
              },
              required: ["id", "type", "sectionInstruction", "question", "correctAnswer"]
            }
          }
        },
        required: ["title", "topic", "questions"]
      }
    }
  });

  const worksheet = JSON.parse(response.text || '{}') as Worksheet;
  worksheet.documentType = documentType;
  worksheet.curriculumStandard = curriculumStandard;
  
  // Extract grounding sources if they exist
  if (useGrounding && response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
    const chunks = response.candidates[0].groundingMetadata.groundingChunks;
    const sources: GroundingSource[] = chunks
      .filter((chunk: any) => chunk.web)
      .map((chunk: any) => ({
        title: chunk.web.title || "Reference",
        uri: chunk.web.uri
      }));
    worksheet.groundingSources = sources;
  }

  return worksheet;
}

export async function generateDoodles(topic: string, gradeLevel: string): Promise<string[]> {
  const prompt = `Create hand-drawn minimalist pencil sketches for a school worksheet about "${topic}" for ${gradeLevel}. Style: simple black line art, white background.`;
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { parts: [{ text: prompt }] }
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

export async function analyzeCourseForBlueprints(
  fileData?: { data: string; mimeType: string },
  rawText?: string
): Promise<{ 
  courseTitle: string;
  suggestedAudience: AudienceCategory;
  suggestedLevel: string;
  blueprints: AssessmentBlueprint[];
} | null> {
  const parts: any[] = [];
  if (fileData) parts.push({ inlineData: { data: fileData.data, mimeType: fileData.mimeType } });
  const promptText = `Analyze course material and propose an assessment plan. Return JSON.`;
  parts.push({ text: promptText });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            courseTitle: { type: Type.STRING },
            suggestedAudience: { type: Type.STRING, enum: Object.values(AudienceCategory) },
            suggestedLevel: { type: Type.STRING },
            blueprints: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  topic: { type: Type.STRING },
                  suggestedDocType: { type: Type.STRING, enum: Object.values(DocumentType) },
                  originModule: { type: Type.STRING },
                  originLesson: { type: Type.STRING }
                },
                required: ["title", "topic", "suggestedDocType", "originModule", "originLesson"]
              }
            }
          },
          required: ["courseTitle", "suggestedAudience", "suggestedLevel", "blueprints"]
        }
      }
    });
    const parsed = JSON.parse(response.text || '{}');
    return {
      ...parsed,
      blueprints: parsed.blueprints.map((b: any) => ({
        ...b,
        id: Math.random().toString(36).substr(2, 9),
        status: 'draft'
      }))
    };
  } catch (error) {
    return null;
  }
}
