import React, { createContext, useContext, useState, ReactNode } from 'react';

interface QuizContextType {
  questions: any[];
  setQuestions: React.Dispatch<React.SetStateAction<any[]>>;
  currentQuestion: number;
  setCurrentQuestion: React.Dispatch<React.SetStateAction<number>>;
}

const QuizContext = createContext<QuizContextType | undefined>(undefined);

export const QuizProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);

  return (
    <QuizContext.Provider value={{ questions, setQuestions, currentQuestion, setCurrentQuestion }}>
      {children}
    </QuizContext.Provider>
  );
};

export const useQuiz = () => {
  const context = useContext(QuizContext);
  if (context === undefined) {
    throw new Error('useQuiz must be used within a QuizProvider');
  }
  return context;
}; 