// QuestionNavigation.tsx
import { motion } from "framer-motion";
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
    <div className="w-full overflow-x-auto py-2 px-1 md:px-4">
      <div className="flex gap-2 md:gap-3 min-w-min">
        {questions.map((q, idx) => {
          const active = idx === currentIndex;
          const answered = answeredIds?.includes(q.id) ?? false;
          return (
            <button
              key={q.id}
              onClick={() => onSelectQuestion(idx)}
              className={`
                flex-shrink-0 
                w-10 h-10 md:w-12 md:h-12 
                flex items-center justify-center 
                font-bold 
                text-base md:text-lg 
                rounded-lg md:rounded-xl
                transition-all
                touch-manipulation
                ${answered ? 'bg-gray-500 hover:bg-gray-600' : 'bg-black hover:bg-gray-900'} 
                text-white
                ${active ? 'ring-2 ring-yellow-400 ring-offset-2' : ''}
              `}
            >
              {idx + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default QuestionNavigation;
