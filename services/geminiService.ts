
import { GoogleGenAI, Type } from "@google/genai";
import { Worksheet, QuestionType, ThemeType, DocumentType, AudienceCategory, LearnerProfile } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export interface GenerationOptions {
  topic: string; 
  customTitle?: string;
  educationalLevel: string; // The specific year/grade
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

export async function analyzeSourceMaterial(
  fileData?: { data: string; mimeType: string },
  rawText?: string
): Promise<{ suggestedTitle: string; suggestedTopicScope: string } | null> {
  const parts: any[] = [];
  if (fileData) parts.push({ inlineData: { data: fileData.data, mimeType: fileData.mimeType } });
  
  const promptText = `Analyze this content and suggest a formal academic title and a specific topic scope for an assessment.
    ${rawText ? `Context: ${rawText}` : ''}
    Return JSON: { "suggestedTitle": "...", "suggestedTopicScope": "..." }`;
  
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
            suggestedTitle: { type: Type.STRING },
            suggestedTopicScope: { type: Type.STRING }
          },
          required: ["suggestedTitle", "suggestedTopicScope"]
        }
      }
    });
    return JSON.parse(response.text || '{}');
  } catch (error) {
    return null;
  }
}

export async function generateWorksheet(options: GenerationOptions): Promise<Worksheet> {
  const { 
    topic, educationalLevel, audienceCategory, learnerProfile, 
    difficulty, language, documentType, questionCounts, 
    rawText, fileData, isMathMode = false
  } = options;

  const parts: any[] = [];
  if (fileData) parts.push({ inlineData: { data: fileData.data, mimeType: fileData.mimeType } });

  const promptText = `
    ROLE: Senior Academic Designer & Subject Matter Expert.
    TASK: Generate a ${documentType} in ${language}.
    
    TARGET AUDIENCE DETAILS:
    - Main Category: ${audienceCategory}
    - Specific Level: ${educationalLevel}
    - Learner Profile: ${learnerProfile}
    - Difficulty Target: ${difficulty}
    
    TOPIC: ${topic}
    ${rawText ? `SOURCE MATERIAL: ${rawText}` : ''}

    STRICT PEDAGOGICAL GUIDELINES:
    1. Language Complexity: Adjust vocabulary and sentence structure strictly for ${audienceCategory} - ${educationalLevel}.
    2. Differentiation: Since profile is ${learnerProfile}, ${
      learnerProfile === LearnerProfile.SPECIAL_ED ? 'use chunked instructions, clear visual cues, and avoid cognitive overload.' : 
      learnerProfile === LearnerProfile.GIFTED ? 'include complex interdisciplinary connections and higher-order thinking.' :
      learnerProfile === LearnerProfile.ESL_ELL ? 'use high-frequency words, clear visual support contexts, and avoid idioms.' : 
      'ensure grade-appropriate rigor.'
    }
    3. Content: ${isMathMode ? 'Use LaTeX ($...$ or $$...$$) for all math.' : 'Ensure academic accuracy.'}
    4. Scoring: Assign appropriate points (0-100 scale) per question.
    
    QUESTION COUNTS:
    ${Object.entries(questionCounts).map(([t, c]) => `- ${t}: ${c}`).join('\n')}

    FORMAT: Return JSON.
  `;
  
  parts.push({ text: promptText });

  try {
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
    worksheet.audienceCategory = audienceCategory;
    worksheet.learnerProfile = learnerProfile;
    return worksheet;
  } catch (error) {
    throw error;
  }
}

export async function generateDoodles(topic: string, gradeLevel: string): Promise<string[]> {
  const prompt = `4 isolated black and white hand-drawn line art doodles about ${topic} for ${gradeLevel}. Pure white background. No text.`;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: prompt }] }
    });
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) return [`data:image/png;base64,${part.inlineData.data}`];
    }
  } catch (e) {}
  return [];
}
