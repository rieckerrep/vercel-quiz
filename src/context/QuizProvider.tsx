import React, { createContext, useContext, ReactNode } from 'react';
import { useQuestions, useAnsweredQuestions, useSaveAnswers } from '../hooks/quiz/useQuizData';
import { useUserStore } from '../store/useUserStore';
import type { QuizContextType, Answer } from '../types/quiz';
import { Database } from '../lib/supabase';

type QuizAnswerInsert = Database['public']['Tables']['answered_questions']['Insert'];

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
  const { mutateAsync: saveAnswerMutation } = useSaveAnswers();

  const value: QuizContextType = {
    // Lade-Status
    isQuestionsLoading,
    isAnsweredQuestionsLoading,
    
    // Fragen und Antworten
    questions,
    subQuestions: [], // Wird später dynamisch geladen
    answeredQuestions,
    answeredSubQuestions: [], // Wird später dynamisch geladen
    
    // Mutations
    saveAnswer: async (answer: Omit<Answer, 'id' | 'answered_at'>) => {
      if (!userId) throw new Error('Kein Benutzer angemeldet');
      if (answer.question_id === null || answer.is_correct === null) {
        throw new Error('Ungültige Antwort: question_id oder is_correct ist null');
      }
      const answers = [{
        questionId: answer.question_id,
        isCorrect: answer.is_correct,
        userId: userId,
        chapterId: chapterId
      }];
      const result = await saveAnswerMutation(answers);
      return result[0];
    },
    
    // Fehler
    questionsError,
    answeredQuestionsError,
    
    // Hilfsfunktionen
    isQuestionAnswered: (questionId: number) => {
      return answeredQuestions.some(q => q.question_id === questionId);
    },
  };

  return <QuizContext.Provider value={value}>{children}</QuizContext.Provider>;
}; 