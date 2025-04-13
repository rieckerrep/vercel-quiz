import React, { createContext, useContext } from 'react';
import { useQuizData, useSaveAnswers } from '../hooks/quiz/useQuizData';
import { QuizAnswer } from '../types/quiz';

interface QuizContextType {
  questions: QuizAnswer[];
  loading: boolean;
  error: string | null;
  saveAnswers: (answers: Omit<QuizAnswer, 'id' | 'answered_at'>[]) => Promise<void>;
}

const QuizContext = createContext<QuizContextType | null>(null);

export const QuizProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { questions, loading, error } = useQuizData();
  const { saveAnswers } = useSaveAnswers();

  const value = {
    questions,
    loading,
    error,
    saveAnswers
  };

  return <QuizContext.Provider value={value}>{children}</QuizContext.Provider>;
};

export const useQuiz = () => {
  const context = useContext(QuizContext);
  if (!context) {
    throw new Error('useQuiz muss innerhalb eines QuizProvider verwendet werden');
  }
  return context;
}; 