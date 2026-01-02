
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
    topic, educationalLevel, audienceCategory, learnerProfile, 
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

  // Optimized prompt for speed
  const promptText = `
    ROLE: Academic Designer.
    TASK: Generate ${bulkCount > 1 ? `${bulkCount} unique variants` : 'one version'} of a ${documentType} in ${language}.
    
    LATEX: Wrap ALL math/fractions/equations in $...$. Fractions use $\\frac{a}{b}$.
    
    CONTEXT:
    - Topic: ${topic}
    - Level: ${audienceCategory} (${educationalLevel})
    - Profile: ${learnerProfile}
    - Difficulty: ${difficulty}
    
    STRUCTURE PER SHEET:
    ${Object.entries(questionCounts).map(([t, c]) => `- ${t}: ${c}`).join('\n')}

    FORMAT: Output JSON matching the Worksheet schema.
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

  // Using Flash for much higher speed on large JSON/Bulk outputs
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview", 
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

/**
 * Generates simple doodle images for worksheet decoration using Gemini Flash Image model.
 * Each doodle is a minimalist black and white line-art icon related to the topic.
 */
export async function generateDoodles(topic: string, gradeLevel: string): Promise<string[]> {
  try {
    const prompt = `Simple hand-drawn black and white minimalist doodle related to ${topic} for a ${gradeLevel} educational worksheet. Single small line art icon. White background.`;
    
    // We make 3 parallel calls to get distinct variations for the palette.
    const results = await Promise.all([1, 2, 3].map(() => 
      ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: prompt }] },
        config: {
          imageConfig: {
            aspectRatio: "1:1"
          }
        }
      })
    ));

    const imageUrls: string[] = [];
    for (const res of results) {
      if (res.candidates?.[0]?.content?.parts) {
        for (const part of res.candidates[0].content.parts) {
          if (part.inlineData) {
            imageUrls.push(`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`);
          }
        }
      }
    }
    return imageUrls;
  } catch (error) {
    console.error("Doodle generation failed:", error);
    return [];
  }
}
