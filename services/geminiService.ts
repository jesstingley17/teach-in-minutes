
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Worksheet, QuestionType, DocumentType, AudienceCategory, LearnerProfile, CurriculumStandard, GroundingSource } from "../types";

// DO NOT initialize at top level to avoid stale keys
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

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

export async function generateDoodles(topic: string, gradeLevel: string): Promise<string[]> {
  try {
    const ai = getAI();
    const prompt = `Hand-drawn minimalist school doodle icon about ${topic} for ${gradeLevel} students. Simple black ink sketch on white background. No text.`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: prompt }] },
      config: { imageConfig: { aspectRatio: "1:1" } }
    });

    const urls: string[] = [];
    const parts = response.candidates?.[0]?.content?.parts;
    if (parts) {
      for (const part of parts) {
        if (part.inlineData) {
          urls.push(`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`);
        }
      }
    }
    return urls;
  } catch (error) {
    console.error("Doodle generation failed:", error);
    return [];
  }
}

export async function generateCoverArt(topic: string, type: DocumentType): Promise<string | undefined> {
  try {
    const ai = getAI();
    const prompt = `Advanced professional academic visualization for a ${type} about ${topic}. High-end 3D abstract or technical drawing. Minimalist academic palette. No text. 16:9 aspect ratio.`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: prompt }] },
      config: { imageConfig: { aspectRatio: "16:9" } }
    });

    const parts = response.candidates?.[0]?.content?.parts;
    if (parts) {
      for (const part of parts) {
        if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
  } catch (error) { console.error(error); }
  return undefined;
}

export async function generateWorksheet(options: GenerationOptions): Promise<Worksheet | Worksheet[]> {
  const { 
    topic, educationalLevel, audienceCategory, learnerProfile, 
    difficulty, language, documentType, questionCounts, 
    rawText, fileData, isMathMode = false, useGrounding = false,
    curriculumStandard = CurriculumStandard.NONE,
    bulkCount = 1
  } = options;

  const isK12 = [
    AudienceCategory.EARLY_YEARS, 
    AudienceCategory.PRIMARY, 
    AudienceCategory.MIDDLE_SCHOOL, 
    AudienceCategory.HIGH_SCHOOL
  ].includes(audienceCategory);

  const parts: any[] = [];
  
  // CRITICAL: Attach the file as the first part so the model grounds its response in the provided document
  if (fileData) {
    parts.push({ inlineData: { data: fileData.data, mimeType: fileData.mimeType } });
  }

  const persona = isK12 
    ? "K-12 Instructional Designer specialized in engaging pedagogy and classroom-appropriate language." 
    : "University Curriculum Architect specialized in high-rigor tertiary education and research-based assessment.";

  const promptText = `
    ROLE: ${persona}
    TASK: Construct a formal ${documentType} based on the provided Knowledge Base / Topic.
    
    INSTRUCTIONS:
    1. If a document (PDF/Image) is attached, it is your PRIMARY KNOWLEDGE BASE. You MUST ground your questions and explanations in its content.
    2. Maintain maximum academic rigor appropriate for the ${audienceCategory} level.
    3. Include a 'rubric' array of criteria if this is an ASSIGNMENT, EXAM, or ESSAY.
    4. Every question MUST have a 'learningOutcome' ID string (e.g., CCSS.MATH.CONTENT.HSA-CED.A.1 for K12 or BLOOM-4.1 for University).
    5. Map content strictly to ${curriculumStandard}.
    6. Suggest a 'primaryColor' in 'visualMetadata' (HEX code) fitting the subject.
    
    CONTENT DETAILS:
    Topic: ${topic}
    Educational Level: ${educationalLevel}
    Additional Constraints: ${rawText || "None provided."}
    Language: ${language}

    LATEX FORMATTING: Mandatory $...$ for all math symbols, equations, and technical notation.
  `;
  
  parts.push({ text: promptText });

  const tools: any[] = [];
  if (useGrounding) tools.push({ googleSearch: {} });

  const schema = {
    title: { type: Type.STRING },
    topic: { type: Type.STRING },
    standardReference: { type: Type.STRING },
    instructorName: { type: Type.STRING },
    courseCode: { type: Type.STRING },
    visualMetadata: { type: Type.OBJECT, properties: { primaryColor: { type: Type.STRING } } },
    rubric: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          criterion: { type: Type.STRING },
          weight: { type: Type.NUMBER },
          description: { type: Type.STRING }
        }
      }
    },
    questions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          type: { type: Type.STRING, enum: Object.values(QuestionType) },
          sectionInstruction: { type: Type.STRING },
          question: { type: Type.STRING },
          learningOutcome: { type: Type.STRING },
          options: { type: Type.ARRAY, items: { type: Type.STRING } },
          correctAnswer: { type: Type.STRING },
          explanation: { type: Type.STRING },
          isChallenge: { type: Type.BOOLEAN },
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
        tools,
        responseMimeType: "application/json",
        responseSchema: bulkCount > 1 
          ? { type: Type.ARRAY, items: { type: Type.OBJECT, properties: schema, required: ["title", "questions"] } }
          : { type: Type.OBJECT, properties: schema, required: ["title", "questions"] }
      }
    });

    const parsed = JSON.parse(response.text || (bulkCount > 1 ? '[]' : '{}'));
    const coverArtPromise = generateCoverArt(topic, documentType);

    const processResult = async (ws: any) => {
      ws.documentType = documentType;
      ws.curriculumStandard = curriculumStandard;
      const coverArt = await coverArtPromise;
      if (coverArt) ws.visualMetadata = { ...ws.visualMetadata, coverImageUrl: coverArt };
      return ws as Worksheet;
    };

    if (Array.isArray(parsed)) return Promise.all(parsed.map(processResult));
    return processResult(parsed);
  } catch (error: any) {
    if (error.message?.includes("Requested entity was not found")) {
      throw new Error("API_KEY_EXPIRED");
    }
    throw error;
  }
}

export async function generateSpeech(text: string): Promise<void> {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Instruction: ${text}` }] }],
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
