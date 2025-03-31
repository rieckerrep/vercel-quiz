import { useQuery } from "@tanstack/react-query";
import { supabase } from "./supabaseClient";
import { Question } from "./store/useQuizStore";

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
      
      // Transformiere die Daten in das erwartete Format
      const validQuestions: Question[] = (data || []).map(question => ({
        id: question.id,
        type: question.type,
        Frage: question.Frage,
        Begründung: question.Begründung || null,
        "Richtige Antwort": question["Richtige Antwort"],
        chapter_id: question.chapter_id,
        course_id: question.course_id || null,
        "Antwort A": question["Antwort A"] || null,
        "Antwort B": question["Antwort B"] || null,
        "Antwort C": question["Antwort C"] || null,
        "Antwort D": question["Antwort D"] || null,
        sub_questions: question.sub_questions?.map(sq => ({
          id: sq.id,
          type: sq.type,
          Frage: sq.Frage,
          Begründung: sq.Begründung || null,
          "Richtige Antwort": sq["Richtige Antwort"],
          chapter_id: sq.chapter_id,
          course_id: sq.course_id || null,
          "Antwort A": sq["Antwort A"] || null,
          "Antwort B": sq["Antwort B"] || null,
          "Antwort C": sq["Antwort C"] || null,
          "Antwort D": sq["Antwort D"] || null
        }))
      }));

      if (validQuestions.length === 0) {
        throw new Error('Keine gültigen Fragen gefunden');
      }

      return validQuestions;
    },
    staleTime: 60 * 1000, // 1 Minute zwischencachen
  });
}
