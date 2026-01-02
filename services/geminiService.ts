
import { GoogleGenAI, Type } from "@google/genai";
import { Worksheet, QuestionType, ThemeType, DocumentType, AudienceCategory, LearnerProfile, Course, AssessmentBlueprint } from "../types";

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
 * Advanced analysis that extracts multiple assessment opportunities from course material.
 * Now includes origin mapping (Module/Lesson).
 */
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
  
  const promptText = `
    ROLE: Academic Program Director.
    TASK: Analyze the syllabus or course material and propose a comprehensive assessment plan.
    
    ${rawText ? `CONTEXT: ${rawText}` : ''}
    
    OUTPUT REQUIREMENTS:
    1. Identify a logical Course Title.
    2. Suggest 4-6 specific Assessments (Worksheets/Exams/Quizzes) based on the sub-topics found.
    3. For each assessment, provide a title, detailed topic scope, and the logical Module and Lesson it belongs to (e.g., "Module 1", "Lesson 3").
    
    FORMAT: Return JSON.
  `;
  
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
    console.error("Blueprint analysis failed", error);
    return null;
  }
}

/**
 * Intelligent analysis of raw source material to pre-fill the generator settings.
 */
export async function analyzeSourceMaterial(
  fileData?: { data: string; mimeType: string },
  rawText?: string
): Promise<{ 
  suggestedTitle: string; 
  suggestedTopicScope: string;
  suggestedAudience: AudienceCategory;
  suggestedLevel: string;
  suggestedDocType: DocumentType;
} | null> {
  const parts: any[] = [];
  if (fileData) parts.push({ inlineData: { data: fileData.data, mimeType: fileData.mimeType } });
  
  const promptText = `
    ROLE: Academic Intelligence Analyst.
    TASK: Analyze the provided content and determine the appropriate academic settings for an assessment.
    
    ${rawText ? `CONTEXT: ${rawText}` : ''}
    
    DETERMINE:
    1. A formal Title.
    2. A specific Topic Scope.
    3. The most likely Audience Category (EARLY_YEARS, PRIMARY, MIDDLE_SCHOOL, HIGH_SCHOOL, UNIVERSITY, PROFESSIONAL).
    4. The specific Grade/Level (e.g. Grade 10, Undergrad Intro).
    5. The most appropriate Document Type (HOMEWORK, ASSIGNMENT, EXAM, QUIZ).
    
    FORMAT: Return JSON.
  `;
  
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
            suggestedTopicScope: { type: Type.STRING },
            suggestedAudience: { type: Type.STRING, enum: Object.values(AudienceCategory) },
            suggestedLevel: { type: Type.STRING },
            suggestedDocType: { type: Type.STRING, enum: Object.values(DocumentType) }
          },
          required: ["suggestedTitle", "suggestedTopicScope", "suggestedAudience", "suggestedLevel", "suggestedDocType"]
        }
      }
    });
    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Analysis failed", error);
    return null;
  }
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
    2. USE LaTeX for all math. Fractions MUST be in $\\frac{a}{b}$ format. Math MUST be wrapped in $...$ delimiters.
    3. CRITICAL: For every single question, provide a 'sectionInstruction'. This is a short, clear, grade-appropriate directive for the student.
       - Grade K-2: "Look and circle", "Draw a line".
       - High School: "Solve for x", "Identify the theme".
       - University: "Critically evaluate", "Derive the solution".
    
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
                sectionInstruction: { type: Type.STRING, description: "Simple grade-appropriate instruction for the student." },
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
  return worksheet;
}

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
