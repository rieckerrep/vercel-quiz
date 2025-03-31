// useQuizAwards.ts
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "./supabaseClient";

export function useQuizAwards(userId: string) {
  const queryClient = useQueryClient();

  // Awarding für alle Fragetypen außer "cases"
  async function awardQuestion(
    questionId: number,
    isCorrect: boolean
  ): Promise<boolean> {
    try {
      // 1) Prüfe, ob die Frage bereits beantwortet wurde
      const { data: existing, error: checkError } = await supabase
        .from("answered_questions")
        .select("*")
        .eq("user_id", userId)
        .eq("question_id", questionId);

      if (checkError) {
        console.error("Error checking question award:", checkError);
        return false;
      }
      if (existing && existing.length > 0) {
        console.log("Question already awarded – skipping reward");
        return false;
      }

      // 2) answered_questions-Eintrag erstellen
      const { error } = await supabase.from("answered_questions").insert([
        {
          user_id: userId,
          question_id: questionId,
          is_correct: isCorrect,
          answered_at: new Date(),
        },
      ]);
      if (error) {
        console.error("Error awarding question:", error);
        return false;
      }

      // 3) Invalidate answeredQuestions-Query (falls du sie nutzt für die Navigation)
      queryClient.invalidateQueries({ queryKey: ["answeredQuestions", userId] });

      // 4) Lokale Stats updaten (Cache) + in user_stats persistieren
      queryClient.setQueryData(["userStats", userId], (oldData: any) => {
        if (!oldData) return oldData;

        const xpDelta = isCorrect ? 10 : 0;
        const coinDelta = isCorrect ? 1 : -1;
        const newXP = oldData.total_xp + xpDelta;
        const newCoins = Math.max(0, oldData.total_coins + coinDelta);

        // 4a) In Supabase user_stats updaten
        supabase
          .from("user_stats")
          .update({ total_xp: newXP, total_coins: newCoins })
          .eq("user_id", userId)
          .then(({ error: statsError }) => {
            if (statsError) {
              console.error("Error updating user_stats:", statsError);
            }
          });

        // 4b) Neuer Wert im React Query Cache (löst Float-Animation aus)
        return {
          ...oldData,
          total_xp: newXP,
          total_coins: newCoins,
        };
      });

      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  }

  // Awarding für Subquestions bei "cases"
  async function awardSubquestion(
    subId: number,
    isCorrect: boolean,
    overallQuestionId: number
  ): Promise<boolean> {
    try {
      // 1) Prüfe, ob die Gesamtfrage bereits beantwortet wurde
      const { data: overallEntry, error: overallError } = await supabase
        .from("answered_questions")
        .select("*")
        .eq("user_id", userId)
        .eq("question_id", overallQuestionId)
        .maybeSingle();

      if (overallError) {
        console.error("Error checking overall question:", overallError);
        return false;
      }
      if (overallEntry) {
        console.log(
          "Overall question already awarded – skipping subquestion reward"
        );
        return false;
      }

      // 2) Prüfe, ob diese Subquestion bereits belohnt wurde
      const { data: existing, error: checkError } = await supabase
        .from("answered_cases_subquestions")
        .select("*")
        .eq("user_id", userId)
        .eq("subquestion_id", subId);

      if (checkError) {
        console.error("Error checking subquestion award:", checkError);
        return false;
      }
      if (existing && existing.length > 0) {
        console.log("Subquestion already awarded");
        return false;
      }

      // 3) Eintrag für subquestion in answered_cases_subquestions
      const { error } = await supabase
        .from("answered_cases_subquestions")
        .insert([
          { user_id: userId, subquestion_id: subId, is_correct: isCorrect },
        ]);
      if (error) {
        console.error("Error awarding subquestion:", error);
        return false;
      }

      // 4) Invalidate answeredQuestions-Query
      queryClient.invalidateQueries({ queryKey: ["answeredQuestions", userId] });

      // 5) Lokale Stats updaten (Cache) + in user_stats persistieren
      queryClient.setQueryData(["userStats", userId], (oldData: any) => {
        if (!oldData) return oldData;

        const xpDelta = isCorrect ? 10 : 0;
        const coinDelta = isCorrect ? 1 : -1;
        const newXP = oldData.total_xp + xpDelta;
        const newCoins = Math.max(0, oldData.total_coins + coinDelta);

        // 5a) user_stats updaten
        supabase
          .from("user_stats")
          .update({ total_xp: newXP, total_coins: newCoins })
          .eq("user_id", userId)
          .then(({ error: statsError }) => {
            if (statsError) {
              console.error("Error updating user_stats:", statsError);
            }
          });

        // 5b) Neuer Wert im React Query Cache
        return {
          ...oldData,
          total_xp: newXP,
          total_coins: newCoins,
        };
      });

      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  }

  return { awardQuestion, awardSubquestion };
}
