
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
 */
export async function analyzeCurriculum(source: { text?: string; file?: { data: string; mimeType: string } }): Promise<LessonStructure[]> {
  const ai = getAI();
  const parts: any[] = [];
  
  if (source.file) {
    parts.push({ inlineData: { data: source.file.data, mimeType: source.file.mimeType } });
  }

  const prompt = `
    Analyze this educational source material. 
    Identify every distinct lesson, chapter, or module contained within.
    For each lesson found, provide:
    1. A clear title.
    2. A brief 2-sentence instructional focus for that specific lesson.
    3. A few key concepts that must be tested.
    
    Return the result as a JSON array of objects.
  `;
  
  if (source.text) {
    parts.push({ text: `Context: ${source.text}` });
  }
  parts.push({ text: prompt });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
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

    return JSON.parse(response.text || '[]');
  } catch (error) {
    console.error("Curriculum Analysis Failed:", error);
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
    ROLE: World-Class Academic Architect & Curriculum Designer.
    TASK: Materialize a DIVERSIFIED INSTRUCTIONAL SUITE for: "${topic}".
    
    COLLECTION GOAL:
    Generate EXACTLY ${containerIntents.length} unique educational instruments.
    IMPORTANT: Each instrument is mapped to a specific sub-topic or lesson. You MUST strictly adhere to the 'specificInstructions' for each node to ensure no overlap and complete coverage of the curriculum.
    
    GLOBAL CONTEXT:
    - OVERALL TOPIC: ${topic}
    - LEVEL: ${educationalLevel}
    - AUDIENCE: ${audienceCategory}
    - LANGUAGE: ${language}
    ${rawText ? `- ANCHOR CONTENT: ${rawText}` : ''}
    
    MATH FORMATTING (CRITICAL):
    - EVERY fraction, equation, mathematical variable, or symbol MUST be wrapped in '$' delimiters.
    - Example: Instead of writing 2/8 or \\frac{2}{8}, you MUST write $\\frac{2}{8}$.
    - Example: Instead of x = 5, write $x = 5$.
    
    INSTRUMENT BLUEPRINTS:
    ${containerIntents.map((intent, i) => `
    [INSTRUMENT ${i+1}]
    - TYPE: ${intent.type}
    - FOCUS: ${intent.specificInstructions || 'General coverage'}
    - DEPTH: ${intent.depth}
    - SCAFFOLDING: ${intent.profile}
    - LAYOUT: ${intent.layout}
    - STRUCTURE: ${Object.entries(intent.questionCounts).map(([t, c]) => `${c}x ${t}`).join(', ')}
    `).join('\n')}

    REQUIREMENTS:
    1. If LAYOUT is LAID_TEACH, generate 'teachingContent' (3 paragraphs of instructional summary) and 'keyTakeaways'.
    2. Maintain strict alignment between the instrument focus and the generated questions.
    
    OUTPUT: A JSON ARRAY of ${containerIntents.length} Worksheet objects.
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
    console.error("Factory Synthesis Failure:", error);
    throw error; 
  }
}
