
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

export enum AudienceCategory {
  EARLY_YEARS = 'EARLY_YEARS',
  PRIMARY = 'PRIMARY',
  MIDDLE_SCHOOL = 'MIDDLE_SCHOOL',
  HIGH_SCHOOL = 'HIGH_SCHOOL',
  UNIVERSITY = 'UNIVERSITY',
  PROFESSIONAL = 'PROFESSIONAL'
}

export enum LearnerProfile {
  GENERAL = 'GENERAL',
  SPECIAL_ED = 'SPECIAL_ED',
  GIFTED = 'GIFTED',
  ESL_ELL = 'ESL_ELL',
  REMEDIAL = 'REMEDIAL'
}

export enum CurriculumStandard {
  NONE = 'NONE',
  COMMON_CORE = 'COMMON_CORE',
  NGSS = 'NGSS',
  IB = 'IB',
  TEKS = 'TEKS',
  GCSE = 'GCSE',
  A_LEVEL = 'A_LEVEL',
  CUSTOM = 'CUSTOM'
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface Collection {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  userId?: string;
}

export interface AssessmentBlueprint {
  id: string;
  title: string;
  topic: string;
  status: 'draft' | 'generating' | 'ready' | 'saved';
  worksheet?: Worksheet;
  suggestedDocType: DocumentType;
  originModule?: string;
  originLesson?: string;
}

export interface Worksheet {
  id?: string;
  userId?: string;
  collectionId?: string;
  courseId?: string;
  moduleId?: string;
  moduleTitle?: string;
  lessonTitle?: string;
  title: string;
  topic: string;
  educationalLevel: string;
  audienceCategory?: AudienceCategory;
  learnerProfile?: LearnerProfile;
  curriculumStandard?: CurriculumStandard;
  standardReference?: string;
  documentType: DocumentType;
  institutionName?: string;
  logoUrl?: string;
  courseCode?: string;
  instructorName?: string;
  duration?: string;
  totalPoints?: number;
  questions: Question[];
  coloringImage?: string; 
  diagramImage?: string;  
  backgroundImage?: string;
  groundingSources?: GroundingSource[];
  savedAt?: number;
}

export enum AppMode {
  GENERATOR = 'GENERATOR',
  WORKSHEET = 'WORKSHEET',
  QUIZ = 'QUIZ',
  BULK_REVIEW = 'BULK_REVIEW'
}

export enum ThemeType {
  CLASSIC = 'CLASSIC',
  CREATIVE = 'CREATIVE',
  MODERN = 'MODERN',
  ACADEMIC = 'ACADEMIC'
}

export interface Question {
  id: string;
  type: QuestionType;
  sectionInstruction?: string;
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
  isChallenge: boolean;
  points?: number;
}
