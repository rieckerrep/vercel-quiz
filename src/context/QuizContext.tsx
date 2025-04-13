import { Database } from '../lib/supabase';

export type QuizContextType = {
  answeredQuestions: Database['public']['Tables']['answered_questions']['Row'][];
  isQuestionAnswered: (questionId: number) => boolean;
  // ... existing code ...
}; 