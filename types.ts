
export enum QuestionType {
  MCQ = 'MCQ',
  TF = 'TF',
  SHORT_ANSWER = 'SHORT_ANSWER',
  VOCABULARY = 'VOCABULARY',
  CHARACTER_DRILL = 'CHARACTER_DRILL',
  SYMBOL_DRILL = 'SYMBOL_DRILL',
  SENTENCE_DRILL = 'SENTENCE_DRILL',
  PAGE_BREAK = 'PAGE_BREAK',
  ESSAY = 'ESSAY',
  MATCHING = 'MATCHING'
}

export enum DocumentType {
  HOMEWORK = 'HOMEWORK',
  ASSIGNMENT = 'ASSIGNMENT',
  EXAM = 'EXAM',
  QUIZ = 'QUIZ'
}

export enum VariationLevel {
  STRICT = 'STRICT', 
  REPHRASE = 'REPHRASE', 
  CREATIVE = 'CREATIVE'
}

export interface Question {
  id: string;
  type: QuestionType;
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
  isChallenge: boolean;
  points?: number;
}

export interface Worksheet {
  id?: string;
  title: string;
  topic: string;
  educationalLevel: string;
  documentType: DocumentType;
  institutionName?: string;
  courseCode?: string;
  instructorName?: string;
  duration?: string;
  totalPoints?: number;
  questions: Question[];
  coloringImage?: string; 
  diagramImage?: string;  
  savedAt?: number;
}

export enum AppMode {
  GENERATOR = 'GENERATOR',
  WORKSHEET = 'WORKSHEET',
  QUIZ = 'QUIZ'
}

export enum ThemeType {
  CLASSIC = 'CLASSIC',
  CREATIVE = 'CREATIVE',
  MODERN = 'MODERN',
  ACADEMIC = 'ACADEMIC'
}

export enum InputMethod {
  PROMPT = 'PROMPT',
  PASTE = 'PASTE',
  UPLOAD = 'UPLOAD'
}
