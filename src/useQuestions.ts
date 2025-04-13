import { useState, useEffect } from 'react';
import { supabase } from './lib/supabaseClient';

export const useQuestions = (chapterId: number) => {
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const { data, error } = await supabase
          .from('questions')
          .select('*')
          .eq('chapter_id', chapterId);

        if (error) throw error;
        setQuestions(data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten');
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, [chapterId]);

  return { questions, loading, error };
}; 