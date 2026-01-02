
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

export interface Collection {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
}

export interface AssessmentBlueprint {
  id: string;
  title: string;
  topic: string;
  status: 'draft' | 'generating' | 'ready' | 'saved';
  worksheet?: Worksheet;
  suggestedDocType: DocumentType;
  originModule?: string; // e.g., "Module 1"
  originLesson?: string;  // e.g., "Lesson 2"
}

export interface CourseModule {
  id: string;
  title: string;
  description: string;
  topics: string[];
  status: 'pending' | 'generated' | 'completed';
}

export interface Course {
  id: string;
  title: string;
  code?: string;
  description: string;
  modules: CourseModule[];
}

export interface Worksheet {
  id?: string;
  collectionId?: string; // Link to a container
  courseId?: string;
  moduleId?: string;
  title: string;
  topic: string;
  educationalLevel: string;
  audienceCategory?: AudienceCategory;
  learnerProfile?: LearnerProfile;
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
  QUIZ = 'QUIZ',
  COURSE_MANAGER = 'COURSE_MANAGER',
  BLUEPRINT_DASHBOARD = 'BLUEPRINT_DASHBOARD',
  COLLECTIONS_VIEW = 'COLLECTIONS_VIEW'
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
  sectionInstruction?: string; // Grade-appropriate directive (e.g., "Look at the numbers and add them.")
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
  isChallenge: boolean;
  points?: number;
}
