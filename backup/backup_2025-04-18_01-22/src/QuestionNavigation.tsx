// QuestionNavigation.tsx
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "./lib/supabaseClient";
import { useQuizStore, Question } from './store/useQuizStore';
import { useEffect, useState } from "react";
import { quizService } from "./api/quizService";
import { authService } from "./api/authService";

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
    refetchInterval: 1000, // Aktualisiere alle 1 Sekunde
  });
}

function useAnsweredSubquestions(userId: string) {
  return useQuery<number[]>({
    queryKey: ["answeredSubquestions", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("answered_cases_subquestions")
        .select("subquestion_id")
        .eq("user_id", userId);
      if (error) throw new Error(error.message);
      return data.map((row: any) => row.subquestion_id);
    },
    enabled: !!userId,
    refetchOnWindowFocus: true,
    refetchInterval: 1000, // Aktualisiere alle 1 Sekunde
  });
}

const QuestionNavigation: React.FC<QuestionNavigationProps> = ({
  questions,
  userId,
  currentIndex,
  onSelectQuestion,
}) => {
  const { data: answeredQuestions = [], refetch: refetchAnsweredQuestions } = useAnsweredQuestions(userId);
  const { data: answeredSubquestions = [], refetch: refetchAnsweredSubquestions } = useAnsweredSubquestions(userId);
  const [casesSubquestionsMap, setCasesSubquestionsMap] = useState<Record<number, number[]>>({});

  // Lade alle Unterfragen für Cases-Fragen
  useEffect(() => {
    const fetchSubquestions = async () => {
      const casesQuestions = questions.filter(q => q.type === "cases");
      const subquestionsMap: Record<number, number[]> = {};
      
      for (const question of casesQuestions) {
        const { data, error } = await supabase
          .from("cases_subquestions")
          .select("id")
          .eq("question_id", question.id);
          
        if (!error && data) {
          subquestionsMap[question.id] = data.map(row => row.id);
        }
      }
      
      setCasesSubquestionsMap(subquestionsMap);
    };
    
    fetchSubquestions();
  }, [questions]);

  return (
    <div className="w-full overflow-x-auto py-2 px-1 md:px-4">
      <div className="flex gap-2 md:gap-3 min-w-min">
        {questions.map((q, idx) => {
          const active = idx === currentIndex;
          const isCasesQuestion = q.type === "cases";
          
          // Eine Frage gilt nur als beantwortet, wenn sie in answered_questions steht
          const isAnswered = answeredQuestions.includes(q.id);
          
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
                ${isAnswered ? 'bg-gray-500 hover:bg-gray-600' : 'bg-black hover:bg-gray-900'} 
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
