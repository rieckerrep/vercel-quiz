import { useQuery } from "@tanstack/react-query";
import { supabase } from "./supabaseClient";

// Frage-Typ an deine Struktur angepasst
export interface Question {
  id: number;
  type: string;
  Frage: string;
  Begründung?: string;
  ["Richtige Antwort"]?: string;
  [key: string]: any; // für dynamische Felder wie bei "cases" oder "lueckentext"
}

// Hook zum Laden der Fragen eines Kapitels
export function useQuestions(chapterId: number) {
  return useQuery<Question[], Error>({
    queryKey: ["questions", chapterId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("questions")
        .select("*")
        .eq("chapter_id", chapterId);

      if (error) throw new Error(error.message);
      return data as Question[];
    },
    staleTime: 60 * 1000, // 1 Minute zwischencachen
  });
}
