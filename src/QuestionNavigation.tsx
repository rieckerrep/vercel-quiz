// QuestionNavigation.tsx
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "./supabaseClient";

export interface Question {
  id: number;
  Frage: string;
  // weitere Eigenschaften, falls benötigt
}

interface QuestionNavigationProps {
  questions: Question[];
  userId: string;
  currentIndex: number;
  onSelectQuestion: (index: number) => void;
}

function useAnsweredQuestions(userId: string) {
  return useQuery<number[]>({
    queryKey: ["answeredQuestions", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("answered_questions")
        .select("question_id")
        .eq("user_id", userId);
      if (error) throw new Error(error.message);
      return data.map((row: any) => row.question_id);
    },
    enabled: !!userId,
    refetchOnWindowFocus: true,
  });
}

const QuestionNavigation: React.FC<QuestionNavigationProps> = ({
  questions,
  userId,
  currentIndex,
  onSelectQuestion,
}) => {
  const {
    data: answeredIds,
    isLoading,
    error,
  } = useAnsweredQuestions(userId);

  if (isLoading) return <div className="text-center p-2">Lade Navigation...</div>;
  if (error) return <div className="text-center p-2 text-red-500">Fehler: {error.message}</div>;

  return (
    <div className="flex overflow-x-auto">
      {questions.map((q, idx) => {
        const active = idx === currentIndex;
        const answered = answeredIds?.includes(q.id) ?? false;
        return (
          <button
            key={q.id}
            onClick={() => onSelectQuestion(idx)}
            className={`flex-shrink-0 w-12 h-12 flex items-center justify-center font-bold text-lg mx-1
              ${answered ? 'bg-gray-500' : 'bg-black'} text-white
              ${active ? 'border border-yellow-400' : ''}`}
          >
            {idx + 1}
          </button>
        );
      })}
    </div>
  );
};

export default QuestionNavigation;
