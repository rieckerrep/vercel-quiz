import { Database } from './supabase';

export type Question = Database['public']['Tables']['questions']['Row'];
export type Subquestion = Database['public']['Tables']['cases_subquestions']['Row'];

export interface FormattedQuestion {
  id: number;
  type: string;
  question_text: string;
  correct_answer: string;
  explanation: string | null;
  chapter_id?: number;
  sub_questions?: Array<{
    id: number;
    statement_text: string;
    correct_answer: string;
    explanation: string | null;
  }>;
}

export interface QuestionOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export type QuestionType = 'multiple_choice' | 'true_false' | 'drag_drop' | 'case_study';

export interface AnsweredQuestion {
  id: number;
  user_id: string;
  question_id: number;
  is_correct: boolean;
  answered_at: string;
}

export interface AnsweredSubQuestion {
  id: number;
  user_id: string;
  sub_question_id: number;
  is_correct: boolean;
  answered_at: string;
}

export interface QuestionResponse {
  question_text: string;
  correct_answer: string;
  explanation: string;
  answers: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  type: string;
  id: number;
  chapter_id: number;
  course_id?: number | null;
  subquestions_count?: number | null;
}

export interface QuestionState {
  isAnswerSubmitted: boolean;
  isAnswerCorrect: boolean | null;
  selectedAnswer: string | null;
  explanation: string | null;
  medalType: 'Gold' | 'Silber' | 'Bronze' | 'Keine';
}

export interface QuestionComponentProps {
  question: Question;
  onAnswerSubmit: (answer: string) => void;
  isAnswerSubmitted: boolean;
  isAnswerCorrect: boolean | null;
  selectedAnswer: string | null;
  explanation: string | null;
} 