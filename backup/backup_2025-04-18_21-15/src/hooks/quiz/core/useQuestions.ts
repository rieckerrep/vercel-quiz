import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { Tables } from '../../../types/supabase';

type DatabaseQuestion = Tables<'questions'>;

export const useQuestions = (chapterId: number) => {
  const [questions, setQuestions] = useState<DatabaseQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const { data, error } = await supabase
          .from('questions')
          .select('*')
          .eq('chapter_id', chapterId)
          .order('order_index');

        if (error) throw error;

        // Filtere null-Werte heraus und konvertiere zu DatabaseQuestion
        const validQuestions = (data || [])
          .filter(q => 
            q.Frage !== null && 
            q["Antwort A"] !== null && 
            q["Antwort B"] !== null && 
            q["Antwort C"] !== null && 
            q["Antwort D"] !== null && 
            q["Richtige Antwort"] !== null && 
            q.Begruendung !== null && 
            q.type !== null
          )
          .map(q => ({
            ...q,
            Frage: q.Frage as string,
            "Antwort A": q["Antwort A"] as string,
            "Antwort B": q["Antwort B"] as string,
            "Antwort C": q["Antwort C"] as string,
            "Antwort D": q["Antwort D"] as string,
            "Richtige Antwort": q["Richtige Antwort"] as string,
            Begruendung: q.Begruendung as string,
            type: q.type as string
          }));

        setQuestions(validQuestions);
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuestions();
  }, [chapterId]);

  return { data: questions, isLoading, error };
}; 