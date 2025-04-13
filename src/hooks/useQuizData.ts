import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Question } from '../types/question';

export const useQuizData = (chapterId: number) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const { data, error } = await supabase
          .from('questions')
          .select('*')
          .eq('chapter_id', chapterId)
          .order('id');

        if (error) throw error;

        setQuestions(data);
        setError(null);
      } catch (err) {
        console.error('Fehler beim Laden der Fragen:', err);
        setError('Die Fragen konnten nicht geladen werden. Bitte versuchen Sie es später erneut.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuestions();
  }, [chapterId]);

  const handleAnswer = async (questionId: number, selectedAnswer: string) => {
    try {
      // Hier können wir später die Antwort in der Datenbank speichern
      console.log('Antwort verarbeitet:', { questionId, selectedAnswer });
    } catch (err) {
      console.error('Fehler beim Speichern der Antwort:', err);
    }
  };

  return { questions, isLoading, error, handleAnswer };
}; 