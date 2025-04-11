export type QuizAnswerInsert = {
  question_id: number;
  user_id: string;
  is_correct: boolean;
  answered_at: string;
  chapter_id: number;
};

export type Question = {
  id: number;
  chapter_id: number;
  type: string;
  "Richtige Antwort": string;
  created_at: string;
};

export type AnsweredQuestion = {
  id: number;
  question_id: number;
  user_id: string;
  is_correct: boolean;
  answered_at: string;
  chapter_id: number;
}; 