import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

// Definiert die Struktur eines SequenceItems für die Anwendung
export interface SequenceItem {
  id: string | number;
  question_id: number;
  text: string;
  correctPosition: number;
  level?: string;
}

/**
 * Hook zum direkten Abfragen der sequence_items Tabelle
 * @param questionId ID der zugehörigen Frage
 * @returns Die formatierten SequenceItems sowie Lade- und Fehlerstatus
 */
export function useSequenceItems(questionId: number) {
  const [items, setItems] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSequenceItems();
  }, [questionId]);

  async function fetchSequenceItems() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("sequence_items")
        .select("*")
        .eq("question_id", questionId)
        .order("position");

      if (error) {
        console.error("Error fetching sequence items:", error);
        return;
      }

      if (data) {
        setItems(data.map((item) => item.text));
      }
    } finally {
      setLoading(false);
    }
  }

  return { items, loading };
}

export default useSequenceItems; 