export type CardState = 'new' | 'learning' | 'review' | 'mastered';
export type CardRating = 'again' | 'hard' | 'good' | 'easy';

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  hint?: string;
  category?: string;
  tags?: string[];
  easeFactor: number;       // default 2.5 in SM-2
  interval: number;         // in days
  repetitions: number;      // review count
  nextReviewDate: string;   // ISO string
  lastReviewedDate?: string;
  state: CardState;
  isFavorite?: boolean;
  aiExplanation?: string;
}

export type QuestionType = 'multiple_choice' | 'true_false' | 'identification';

export interface QuizQuestion {
  id: string;
  type: QuestionType;
  question: string;
  options?: string[]; // for multiple choice & true_false
  correctAnswer: string;
  explanation: string;
  topicCategory?: string;
}

export interface KeyConcept {
  title: string;
  explanation: string;
  keyPoints: string[];
}

export interface GlossaryTerm {
  term: string;
  definition: string;
  example?: string;
}

export interface ExamQuestion {
  question: string;
  modelAnswer: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
}

export interface StudySummary {
  overview: string;
  keyConcepts: KeyConcept[];
  glossary: GlossaryTerm[];
  examQuestions: ExamQuestion[];
}

export type FileSourceType = 'upload' | 'external_url' | 'manual_notes';

export interface StudyFileRecord {
  id: string;
  userId: string;
  studySetId?: string | null;
  fileName: string;
  fileType: string;
  fileSize: number;
  storagePath?: string | null;
  sourceType: FileSourceType;
  sourceUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StudyNoteRecord {
  id: string;
  userId: string;
  studySetId?: string | null;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudySet {
  id: string;
  title: string;
  description: string;
  category: 'Tourism' | 'Accounting' | 'Events' | 'General' | 'Other';
  tags: string[];
  fileName?: string;
  fileType?: string;
  fileId?: string;
  storagePath?: string;
  sourceType?: FileSourceType;
  sourceUrl?: string;
  flashcards: Flashcard[];
  quizQuestions: QuizQuestion[];
  summary: StudySummary;
  createdAt: string;
  updatedAt: string;
  lastStudied?: string;
  isPreset?: boolean;
  isFavorite?: boolean;
  isPublic?: boolean;
  shareCode?: string;
  userId?: string;
  themeColor: 'pink' | 'blue' | 'lavender';
  author: string;
}

export interface UserStats {
  totalMastered: number;
  quizzesCompleted: number;
  correctAnswersTotal: number;
  totalQuestionsAnswered: number;
  studyStreak: number;
  totalStudyMinutes: number;
  xp: number;
  level: number;
  rankTitle: string;
  waterGlassesToday: number;
  lastActiveDate: string;
}

export interface Achievement {
  id: string;
  icon: string;
  title: string;
  description: string;
  category: 'study' | 'quiz' | 'streak' | 'special';
  unlocked: boolean;
  unlockedAt?: string;
  progress: number;
  maxProgress: number;
}

export interface MemoryTimelineItem {
  id: string;
  dateStr: string;
  title: string;
  location: string;
  tag: string;
  description: string;
  emoji: string;
  chobeeQuote: string;
}
