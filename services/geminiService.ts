
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Worksheet, QuestionType, DocumentType, AudienceCategory, LearnerProfile, CurriculumStandard, GroundingSource } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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
  bulkCount?: number;
}

export async function generateWorksheet(options: GenerationOptions): Promise<Worksheet | Worksheet[]> {
  const { 
    topic, courseContext, educationalLevel, audienceCategory, learnerProfile, 
    difficulty, language, documentType, questionCounts, 
    rawText, fileData, isMathMode = false, useGrounding = false,
    curriculumStandard = CurriculumStandard.NONE,
    bulkCount = 1
  } = options;

  const parts: any[] = [];
  
  if (fileData) {
    parts.push({ 
      inlineData: { 
        data: fileData.data, 
        mimeType: fileData.mimeType 
      } 
    });
  }

  const promptText = `
    ROLE: Senior Academic Designer.
    TASK: Generate ${bulkCount > 1 ? `${bulkCount} unique versions of a` : 'a'} high-quality ${documentType} in ${language}.
    
    LATEX RULES:
    1. EVERY mathematical symbol, fraction, or equation MUST be wrapped in single dollar signs like $...$.
    2. Fractions MUST be written as $\\frac{a}{b}$.
    3. Even simple numbers like $72 \\frac{11}{12}$ MUST be wrapped in dollar signs if they contain fractions.
    4. NEVER output raw backslashes without dollar delimiters.

    SOURCE MATERIAL:
    ${fileData ? '1. Analyze the ATTACHED MEDIA (PDF/Image). This is the primary source.' : ''}
    ${rawText ? `2. Supplementary instructions: "${rawText}"` : ''}
    
    CONTEXT:
    - Topic: ${topic}
    - Level: ${audienceCategory} (${educationalLevel})
    - Learner Profile: ${learnerProfile}
    - Standards: ${curriculumStandard}
    - Difficulty: ${difficulty}
    
    QUESTION MIX PER SHEET:
    ${Object.entries(questionCounts).map(([t, c]) => `- ${t}: ${c}`).join('\n')}

    FORMAT: Return ${bulkCount > 1 ? 'an ARRAY of objects' : 'a single object'} matching the Worksheet structure.
  `;
  
  parts.push({ text: promptText });

  const tools: any[] = [];
  if (useGrounding) {
    tools.push({ googleSearch: {} });
  }

  const worksheetSchemaProperties = {
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
  };

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: { parts },
    config: {
      tools,
      responseMimeType: "application/json",
      responseSchema: bulkCount > 1 
        ? { type: Type.ARRAY, items: { type: Type.OBJECT, properties: worksheetSchemaProperties, required: ["title", "topic", "questions"] } }
        : { type: Type.OBJECT, properties: worksheetSchemaProperties, required: ["title", "topic", "questions"] }
    }
  });

  const parsed = JSON.parse(response.text || (bulkCount > 1 ? '[]' : '{}'));
  
  const processResult = (ws: any) => {
    ws.documentType = documentType;
    ws.curriculumStandard = curriculumStandard;
    if (useGrounding && response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
      const chunks = response.candidates[0].groundingMetadata.groundingChunks;
      ws.groundingSources = chunks.filter((c: any) => c.web).map((c: any) => ({ title: c.web.title || "Ref", uri: c.web.uri }));
    }
    return ws as Worksheet;
  };

  return Array.isArray(parsed) ? parsed.map(processResult) : processResult(parsed);
}

export async function generateSpeech(text: string): Promise<void> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Read this clearly: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
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
  } catch (error) { console.error(error); }
}

export async function generateDoodles(topic: string, gradeLevel: string): Promise<string[]> {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { parts: [{ text: `Hand-drawn minimalist pencil sketch for "${topic}" for ${gradeLevel}. Black line art, white background.` }] }
  });
  return response.candidates?.[0]?.content?.parts?.filter(p => p.inlineData).map(p => `data:${p.inlineData.mimeType};base64,${p.inlineData.data}`) || [];
}
