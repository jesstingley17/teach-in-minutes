
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Worksheet, QuestionType, ThemeType, DocumentType, AudienceCategory, LearnerProfile, AssessmentBlueprint, CurriculumStandard, GroundingSource } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Audio Helper Functions (Manual implementation as per guidelines)
function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

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

/**
 * Text-to-Speech using Gemini 2.5 Flash native audio.
 * Reads out questions or instructions for accessibility.
 */
export async function generateSpeech(text: string): Promise<void> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Read this clearly for a student: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const decodedData = decodeBase64(base64Audio);
      const audioBuffer = await decodeAudioData(decodedData, audioCtx, 24000, 1);
      
      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioCtx.destination);
      source.start();
    }
  } catch (error) {
    console.error("Speech generation failed", error);
  }
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
