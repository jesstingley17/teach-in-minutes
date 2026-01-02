
export enum QuestionType {
  MCQ = 'MCQ',
  TF = 'TF',
  SHORT_ANSWER = 'SHORT_ANSWER',
  VOCABULARY = 'VOCABULARY',
  ESSAY = 'ESSAY',
  MATCHING = 'MATCHING',
  LAB_PROCEDURE = 'LAB_PROCEDURE',
  CREATIVE_PROMPT = 'CREATIVE_PROMPT'
}

export enum DocumentType {
  HOMEWORK = 'HOMEWORK',
  ASSIGNMENT = 'ASSIGNMENT',
  EXAM = 'EXAM',
  QUIZ = 'QUIZ',
  LAB_REPORT = 'LAB_REPORT',
  GUIDED_NOTES = 'GUIDED_NOTES',
  DEBATE_PREP = 'DEBATE_PREP',
  PRACTICE_SET = 'PRACTICE_SET',
  SYLLABUS_WRAP = 'SYLLABUS_WRAP'
}

export enum LayoutStyle {
  LAID_TEACH = 'LAID_TEACH',
  CLASSIC = 'CLASSIC',
  ARCHITECT = 'ARCHITECT',
  MODULAR = 'MODULAR'
}

export enum AestheticMode {
  PAPER = 'PAPER',
  BLUEPRINT = 'BLUEPRINT',
  ACADEMIC_JOURNAL = 'ACADEMIC_JOURNAL',
  PRIMARY_SCHOOL = 'PRIMARY_SCHOOL'
}

export enum CognitiveDepth {
  RECALL = 'RECALL',
  UNDERSTANDING = 'UNDERSTANDING',
  APPLICATION = 'APPLICATION',
  ANALYSIS = 'ANALYSIS',
  EVALUATION = 'EVALUATION',
  CREATION = 'CREATION'
}

export enum AudienceCategory {
  EARLY_YEARS = 'EARLY_YEARS',
  PRIMARY = 'PRIMARY',
  MIDDLE_SCHOOL = 'MIDDLE_SCHOOL',
  HIGH_SCHOOL = 'HIGH_SCHOOL',
  UNIVERSITY = 'UNIVERSITY',
  POST_GRAD = 'POST_GRAD',
  PROFESSIONAL = 'PROFESSIONAL'
}

export enum LearnerProfile {
  GENERAL = 'GENERAL',
  SPECIAL_ED = 'SPECIAL_ED',
  GIFTED = 'GIFTED',
  ESL_ELL = 'ESL_ELL',
  ADHD_FRIENDLY = 'ADHD_FRIENDLY',
  DYSLEXIA_FRIENDLY = 'DYSLEXIA_FRIENDLY',
  VOCATIONAL = 'VOCATIONAL',
  REMEDIAL = 'REMEDIAL',
  ACCELERATED = 'ACCELERATED'
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

export interface ContainerIntent {
  id: string;
  type: DocumentType;
  profile: LearnerProfile;
  layout: LayoutStyle;
  depth: CognitiveDepth;
  questionCounts: Record<string, number>;
  specificInstructions?: string;
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface VisualMetadata {
  primaryColor?: string;
  layoutStyle?: LayoutStyle;
  aestheticMode?: AestheticMode;
}

export interface BrandingConfig {
  institutionName: string;
  instructorName: string;
  logoUrl?: string;
  primaryColor: string;
  customDomain?: string;
  defaultTheme: ThemeType;
}

export interface Worksheet {
  id?: string;
  title: string;
  topic: string;
  educationalLevel: string;
  audienceCategory?: AudienceCategory;
  learnerProfile?: LearnerProfile;
  documentType: DocumentType;
  institutionName?: string;
  logoUrl?: string;
  instructorName?: string;
  teachingContent?: string;
  keyTakeaways?: string[];
  questions: Question[];
  visualMetadata?: VisualMetadata;
  savedAt?: number;
}

export enum AppMode {
  ONBOARDING = 'ONBOARDING',
  GENERATOR = 'GENERATOR',
  WORKSHEET = 'WORKSHEET',
  BULK_REVIEW = 'BULK_REVIEW',
  SETTINGS = 'SETTINGS'
}

export enum ThemeType {
  CLASSIC = 'CLASSIC',
  GAMMA = 'GAMMA'
}

export interface Question {
  id: string;
  type: QuestionType;
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
  points?: number;
}
