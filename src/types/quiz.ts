import { Database } from '@/lib/supabase';

// Basis-Typen aus der Datenbank
export type Question = Database['public']['Tables']['questions']['Row'];
export type SubQuestion = Database['public']['Tables']['cases_subquestions']['Row'];
export type Answer = Database['public']['Tables']['answered_questions']['Row'];
export type UserSubQuestionAnswer = Database['public']['Tables']['answered_cases_subquestions']['Row'];
export type UserStats = Database['public']['Tables']['user_stats']['Row'];

// FormattedQuestion Typ basierend auf der Datenbank
export type FormattedQuestion = Question & {
  answers: {
    A: string | null;
    B: string | null;
    C: string | null;
    D: string | null;
  };
};

// Gemeinsame Quiz-Typen
export type QuizAnswer = Answer;

// Definiere einen strikteren Typ für das Einfügen von Antworten
export type QuizAnswerInsert = {
  question_id: number;
  user_id: string;
  is_correct: boolean;
  answered_at: string;
  chapter_id: number;
};

export interface QuizSubAnswer {
  subQuestionId: number;
  isCorrect: boolean;
  timestamp: string;
}

export interface QuizProgress {
  currentIndex: number;
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  streak: number;
  maxStreak: number;
}

export interface QuizRewards {
  xp: number;
  coins: number;
  possibleXp: number;
  showAnimation: boolean;
  isAnimationPlaying: boolean;
}

export interface QuizAnimations {
  showReward: boolean;
  showLevelUp: boolean;
  isPlaying: boolean;
}

// Events für die Kommunikation zwischen Hooks
export type QuizEvent = 
  | { type: 'ANSWER_SUBMITTED'; payload: QuizAnswer }
  | { type: 'SUB_ANSWER_SUBMITTED'; payload: QuizSubAnswer }
  | { type: 'PROGRESS_UPDATED'; payload: QuizProgress }
  | { type: 'REWARDS_UPDATED'; payload: QuizRewards }
  | { type: 'ANIMATION_STARTED'; payload: QuizAnimations }
  | { type: 'ANIMATION_ENDED' };

export enum QuestionType {
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',
  DRAG_AND_DROP = 'DRAG_AND_DROP',
  SEQUENCE = 'SEQUENCE'
}

export interface QuestionOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface DragAndDropGroup {
  id: string;
  name: string;
  items: string[];
}

export interface QuizQuestion {
  id: string;
  type: QuestionType;
  text: string;
  options?: QuestionOption[];
  groups?: DragAndDropGroup[];
  items: string[];
  correctAnswers: string[] | Record<string, string[]>;
  correctOrder?: string[];
  explanation: string;
  difficulty: number;
  category: string;
  timeLimit?: number;
}

export type UserAnswer = {
  questionId: number;
  answerId: string;
  isCorrect: boolean;
  timestamp: string;
};

export interface QuizState {
  currentQuestion: FormattedQuestion | null;
  userAnswers: UserAnswer[];
  isLoading: boolean;
  error: string | null;
}

export interface QuizContextType {
  state: QuizState;
  submitAnswer: (questionId: number, answerId: string) => Promise<void>;
  loadQuestion: (chapterId: number) => Promise<void>;
}

export interface LevelData {
  id: number;
  level_title: string;
  xp_required: number;
  level_image: string;
  level_number: number;
}

export interface LeagueData {
  id: number;
  name: string;
  league_img: string;
}

export interface DragPair {
  id: number;
  group_id: number;
  drag_text: string;
  correct_match: string;
} 