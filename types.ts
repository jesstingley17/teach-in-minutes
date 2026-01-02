
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
  QUIZ = 'QUIZ',
  LAB_REPORT = 'LAB_REPORT',
  GUIDED_NOTES = 'GUIDED_NOTES',
  DEBATE_PREP = 'DEBATE_PREP'
}

export enum LayoutStyle {
  LAID_TEACH = 'LAID_TEACH',
  CLASSIC = 'CLASSIC',
  ARCHITECT = 'ARCHITECT'
}

export enum AestheticMode {
  PAPER = 'PAPER',
  CHALKBOARD = 'CHALKBOARD',
  BLUEPRINT = 'BLUEPRINT'
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
  DYSLEXIA_FRIENDLY = 'DYSLEXIA_FRIENDLY',
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

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface RubricCriterion {
  criterion: string;
  weight: number;
  description: string;
}

export interface VisualMetadata {
  coverImageUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  fontStyle?: string;
  subjectAesthetic?: string;
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
  teachingContent?: string;
  keyTakeaways?: string[];
  questions: Question[];
  rubric?: RubricCriterion[];
  visualMetadata?: VisualMetadata;
  groundingSources?: GroundingSource[];
  savedAt?: number;
}

export enum AppMode {
  ONBOARDING = 'ONBOARDING',
  GENERATOR = 'GENERATOR',
  WORKSHEET = 'WORKSHEET',
  QUIZ = 'QUIZ',
  BULK_REVIEW = 'BULK_REVIEW',
  SETTINGS = 'SETTINGS'
}

export enum ThemeType {
  CLASSIC = 'CLASSIC',
  CREATIVE = 'CREATIVE',
  MODERN = 'MODERN',
  ACADEMIC = 'ACADEMIC',
  GAMMA = 'GAMMA'
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
  learningOutcome?: string;
}
