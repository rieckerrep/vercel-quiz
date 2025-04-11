import React, { createContext, useContext, ReactNode } from 'react';
import { useQuizData } from '../hooks/quiz/useQuizData';
import { useUserStore } from '../store/useUserStore';
import type { QuizContextType } from '../types/quiz';

const QuizContext = createContext<QuizContextType | null>(null);

export const useQuiz = () => {
  const context = useContext(QuizContext);
  if (!context) {
    throw new Error('useQuiz muss innerhalb eines QuizProviders verwendet werden');
  }
  return context;
};

interface QuizProviderProps {
  children: ReactNode;
  chapterId: number;
}

export const QuizProvider: React.FC<QuizProviderProps> = ({ children, chapterId }) => {
  const userId = useUserStore((state) => state.profile?.id);
  const quizData = useQuizData();

  // Fragen des Kapitels laden
  const {
    data: questions = [],
    isLoading: isQuestionsLoading,
    error: questionsError,
  } = quizData.useQuestions(chapterId);

  // Beantwortete Fragen des Users laden
  const { data: answeredQuestionsData } = quizData.useAnsweredQuestions(userId || '');
  const answeredQuestions = answeredQuestionsData ?? [];

  // Mutation für das Speichern von Antworten
  const { mutateAsync: saveAnswer } = quizData.useSaveAnswer();

  const value: QuizContextType = {
    // Lade-Status
    isQuestionsLoading,
    isAnsweredQuestionsLoading: false,
    
    // Fragen und Antworten
    questions,
    subQuestions: [], // Wird später dynamisch geladen
    answeredQuestions,
    answeredSubQuestions: [], // Wird später dynamisch geladen
    
    // Mutations
    saveAnswer,
    
    // Fehler
    questionsError,
    answeredQuestionsError: null,
    
    // Hilfsfunktionen
    isQuestionAnswered: (questionId: number) => 
      answeredQuestions.some(q => q.question_id === questionId),
  };

  return <QuizContext.Provider value={value}>{children}</QuizContext.Provider>;
}; 