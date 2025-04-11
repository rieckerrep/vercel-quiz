import React, { createContext, useContext, ReactNode } from 'react';
import { useQuestions, useAnsweredQuestions, useSaveAnswer } from '../hooks/quiz/useQuizData';
import { useUserStore } from '../store/useUserStore';
import type { QuizContextType, UserAnswer, QuizAnswer } from '../types/quiz';

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
  
  // Fragen des Kapitels laden
  const {
    data: questions = [],
    isLoading: isQuestionsLoading,
    error: questionsError,
  } = useQuestions(chapterId);

  // Beantwortete Fragen des Users laden
  const { data: answeredQuestionsData, isLoading: isAnsweredQuestionsLoading, error: answeredQuestionsError } = useAnsweredQuestions(userId || '');
  const answeredQuestions = answeredQuestionsData ?? [];

  // Mutation für das Speichern von Antworten
  const { mutateAsync: saveAnswerMutation } = useSaveAnswer();

  const value: QuizContextType = {
    // Lade-Status
    isQuestionsLoading,
    isAnsweredQuestionsLoading,
    
    // Fragen und Antworten
    questions,
    subQuestions: [], // Wird später dynamisch geladen
    answeredQuestions: answeredQuestions as UserAnswer[],
    answeredSubQuestions: [], // Wird später dynamisch geladen
    
    // Mutations
    saveAnswer: async (answer: Omit<UserAnswer, 'id' | 'answered_at'>) => {
      if (!answer.question_id || answer.is_correct === null || !answer.user_id) {
        throw new Error('Ungültige Antwortdaten');
      }
      return saveAnswerMutation({
        questionId: answer.question_id,
        isCorrect: answer.is_correct,
        userId: answer.user_id
      });
    },
    
    // Fehler
    questionsError,
    answeredQuestionsError,
    
    // Hilfsfunktionen
    isQuestionAnswered: (questionId: number) => 
      answeredQuestions.some(q => q.question_id === questionId),
  };

  return <QuizContext.Provider value={value}>{children}</QuizContext.Provider>;
}; 