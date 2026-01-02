
import { GoogleGenAI, Type } from "@google/genai";
import { Worksheet, QuestionType, ThemeType, VariationLevel, DocumentType } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export interface GenerationOptions {
  topic: string; 
  customTitle?: string;
  gradeLevel: string;
  difficulty: string;
  language: string;
  documentType: DocumentType;
  questionCounts: Record<string, number>;
  variationLevels?: Record<string, VariationLevel>;
  rawText?: string;
  fileData?: { data: string; mimeType: string };
  pageTarget?: number;
  includeTracing?: boolean;
  includeDiagram?: boolean;
  diagramLabelType?: 'LABELED' | 'BLANK';
  theme?: ThemeType;
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
    topic, customTitle, gradeLevel, difficulty, language, 
    documentType, questionCounts, variationLevels = {},
    rawText, fileData, theme = ThemeType.CLASSIC, isMathMode = false
  } = options;

  let diagramImageBase64 = '';
  if (options.includeDiagram) {
    const diagramPrompt = `Academic technical diagram for ${topic} at ${gradeLevel} level. Black and white scientific line art. Pure white background. Clear labels.`;
    try {
      const diagResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: diagramPrompt }] }
      });
      for (const part of diagResponse.candidates[0].content.parts) {
        if (part.inlineData) { diagramImageBase64 = `data:image/png;base64,${part.inlineData.data}`; break; }
      }
    } catch (e) {}
  }

  const parts: any[] = [];
  if (fileData) parts.push({ inlineData: { data: fileData.data, mimeType: fileData.mimeType } });

  const promptText = `
    ROLE: Senior Academic Examiner.
    TASK: Generate a high-quality ${documentType} in ${language} for ${gradeLevel}.
    TOPIC: ${topic}
    DIFFICULTY: ${difficulty}
    
    INSTRUCTIONS:
    - Create exactly the requested number of questions.
    - For EXAM type: Use formal, rigorous language. Include point values for each question.
    - For HOMEWORK type: Use engaging but instructional language.
    - Each question must have a 'correctAnswer' and a 'explanation' for the teacher key.
    - ${isMathMode ? 'Use LaTeX-style notation for math expressions.' : ''}
    
    COUNTS:
    ${Object.entries(questionCounts).map(([t, c]) => `- ${t}: ${c}`).join('\n')}

    FORMAT: Return a JSON object matching the worksheet structure.
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
    worksheet.diagramImage = diagramImageBase64;
    return worksheet;
  } catch (error) {
    throw error;
  }
}

export async function refineSourceText(text: string): Promise<string> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Clean and refine this educational text for question generation: "${text}"`,
  });
  return response.text || text;
}

export async function generateTopicScopeSuggestion(title: string, ageGroup: string): Promise<string> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Suggest a 1-sentence learning objective for a worksheet titled "${title}" for ${ageGroup}.`,
  });
  return response.text || "";
}

export async function generateDoodles(topic: string, gradeLevel: string): Promise<string[]> {
  const prompt = `4 isolated black and white hand-drawn line art doodles about ${topic}. Pure white background. No text.`;
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
