// QuizContext.tsx
import React, { createContext, useContext, useState, ReactNode } from "react";
import { supabase } from "./supabaseClient";

interface QuizContextType {
  currentIndex: number;
  setCurrentIndex: (index: number) => void;
  roundXp: number;
  setRoundXp: React.Dispatch<React.SetStateAction<number>>;
  roundCoins: number;
  setRoundCoins: React.Dispatch<React.SetStateAction<number>>;
  possibleRoundXp: number;
  setPossibleRoundXp: React.Dispatch<React.SetStateAction<number>>;
  awardQuestion: (
    questionId: number,
    isCorrect: boolean,
    userId: string
  ) => Promise<boolean>;
}

const QuizContext = createContext<QuizContextType>({
  currentIndex: 0,
  setCurrentIndex: () => {},
  roundXp: 0,
  setRoundXp: () => {},
  roundCoins: 0,
  setRoundCoins: () => {},
  possibleRoundXp: 0,
  setPossibleRoundXp: () => {},
  awardQuestion: async () => false,
});

interface QuizProviderProps {
  children: ReactNode;
}

export const QuizProvider = ({ children }: QuizProviderProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [roundXp, setRoundXp] = useState(0);
  const [roundCoins, setRoundCoins] = useState(0);
  const [possibleRoundXp, setPossibleRoundXp] = useState(0);

  // Funktion, um eine Frage als beantwortet zu markieren und entsprechende XP/Coins zu vergeben
  const awardQuestion = async (
    questionId: number,
    isCorrect: boolean,
    userId: string
  ): Promise<boolean> => {
    try {
      await supabase.from("answered_questions").insert([
        {
          user_id: userId,
          question_id: questionId,
          is_correct: isCorrect,
          answered_at: new Date(),
        },
      ]);
      if (isCorrect) {
        setRoundXp((prev) => prev + 10);
        setRoundCoins((prev) => prev + 1);
      } else {
        setRoundCoins((prev) => Math.max(0, prev - 1));
      }
      return true;
    } catch (error) {
      console.error("Error awarding question", error);
      return false;
    }
  };

  return (
    <QuizContext.Provider
      value={{
        currentIndex,
        setCurrentIndex,
        roundXp,
        setRoundXp,
        roundCoins,
        setRoundCoins,
        possibleRoundXp,
        setPossibleRoundXp,
        awardQuestion,
      }}
    >
      {children}
    </QuizContext.Provider>
  );
};

export const useQuiz = (): QuizContextType => {
  const context = useContext(QuizContext);
  if (context === undefined) {
    throw new Error("useQuiz must be used within a QuizProvider");
  }
  return context;
};
