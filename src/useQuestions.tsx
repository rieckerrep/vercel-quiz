import { useQuery } from "@tanstack/react-query";
import { supabase } from "./supabaseClient";

// Frage-Typ an deine Struktur angepasst
export interface Question {
  id: number;
  type: string;
  Frage: string;
  Begründung: string | null;
  ["Richtige Antwort"]?: string;
  chapter_id: number;
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
      
      // Konvertiere undefined zu null für das Begründung-Feld
      return (data || []).map(question => ({
        ...question,
        Begründung: question.Begründung || null
      })) as Question[];
    },
    staleTime: 60 * 1000, // 1 Minute zwischencachen
  });
}
