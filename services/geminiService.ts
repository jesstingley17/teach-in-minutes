
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
    Even if instruments have the same DocumentType, they MUST vary in their specific content focus to provide a complete learning experience.
    
    GLOBAL CONTEXT:
    - TOPIC: ${topic}
    - LEVEL: ${educationalLevel}
    - AUDIENCE: ${audienceCategory}
    - LANGUAGE: ${language}
    ${rawText ? `- ANCHOR CONTENT: ${rawText}` : ''}
    
    MATH FORMATTING (CRITICAL):
    - EVERY fraction, equation, mathematical variable, or symbol MUST be wrapped in '$' delimiters.
    - Example: Instead of writing 2/8 or \\frac{2}{8}, you MUST write $\\frac{2}{8}$.
    - Example: Instead of x = 5, write $x = 5$.
    - NEVER output raw LaTeX commands without the '$' wrappers.
    
    INSTRUMENT BLUEPRINTS:
    ${containerIntents.map((intent, i) => `
    [INSTRUMENT ${i+1}]
    - TYPE: ${intent.type}
    - DEPTH: ${intent.depth}
    - SCAFFOLDING: ${intent.profile}
    - LAYOUT: ${intent.layout}
    - STRUCTURE: ${Object.entries(intent.questionCounts).map(([t, c]) => `${c}x ${t}`).join(', ')}
    - SPECIFIC GOAL: ${intent.specificInstructions || 'Generate comprehensive coverage of the topic.'}
    `).join('\n')}

    REQUIREMENTS:
    1. If LAYOUT is LAID_TEACH, generate 'teachingContent' (3 paragraphs of rigorous instructional summary) and 'keyTakeaways' (5 punchy points).
    2. Ensure pedagogical accuracy and age-appropriate vocabulary.
    3. PRINT OPTIMIZATION: Density is preferred over whitespace.
    
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
