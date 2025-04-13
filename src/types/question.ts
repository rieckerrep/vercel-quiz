import { Database } from './supabase';
import { FormattedQuestion } from './supabase';

export type Question = FormattedQuestion;

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

export type QuestionType = 'multiple_choice' | 'open_question' | 'fill_in_blank' | 'case';

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