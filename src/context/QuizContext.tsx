import { createContext, useContext, useState, ReactNode } from 'react';
import { Database } from '../types/supabase';

export type QuizContextType = {
  currentIndex: number;
  roundXp: number;
  roundCoins: number;
  possibleRoundXp: number;
  answeredQuestions: Database['public']['Tables']['answered_questions']['Row'][];
  isQuestionAnswered: (questionId: number) => boolean;
};

const QuizContext = createContext<QuizContextType | undefined>(undefined);

export const useQuizContext = () => {
  const context = useContext(QuizContext);
  if (!context) {
    throw new Error('useQuizContext must be used within a QuizProvider');
  }
  return context;
};

interface QuizProviderProps {
  children: ReactNode;
}

export const QuizProvider: React.FC<QuizProviderProps> = ({ children }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [roundXp, setRoundXp] = useState(0);
  const [roundCoins, setRoundCoins] = useState(0);
  const [possibleRoundXp, setPossibleRoundXp] = useState(0);
  const [answeredQuestions, setAnsweredQuestions] = useState<Database['public']['Tables']['answered_questions']['Row'][]>([]);

  const isQuestionAnswered = (questionId: number) => {
    return answeredQuestions.some(q => q.question_id === questionId);
  };

  const value = {
    currentIndex,
    roundXp,
    roundCoins,
    possibleRoundXp,
    answeredQuestions,
    isQuestionAnswered
  };

  return (
    <QuizContext.Provider value={value}>
      {children}
    </QuizContext.Provider>
  );
}; 