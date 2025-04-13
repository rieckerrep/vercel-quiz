import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Database } from '../lib/supabase';

type UserStats = Database['public']['Tables']['user_stats']['Row'];

export const useUserStats = (userId?: string) => {
  const [data, setData] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchUserStats = async () => {
      if (!userId) {
        setData(null);
        setLoading(false);
        return;
      }

      try {
        // Überprüfe zuerst die Session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          throw new Error('Session-Fehler: ' + sessionError.message);
        }

        if (!session) {
          throw new Error('Keine aktive Session');
        }

        // Führe die Abfrage nur aus, wenn eine gültige Session existiert
        const { data: stats, error: queryError } = await supabase
          .from('user_stats')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (queryError) {
          console.error('Datenbankfehler:', queryError);
          throw new Error('Fehler beim Abrufen der Benutzerstatistiken');
        }

        if (!stats) {
          // Erstelle neue Statistiken, falls keine existieren
          const { data: newStats, error: insertError } = await supabase
            .from('user_stats')
            .insert([
              {
                user_id: userId,
                total_xp: 0,
                total_coins: 0,
                level: 1,
                questions_answered: 0,
                correct_answers: 0,
                streak: 0,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }
            ])
            .select()
            .single();

          if (insertError) {
            throw new Error('Fehler beim Erstellen der Benutzerstatistiken');
          }

          setData(newStats);
        } else {
          setData(stats);
        }
      } catch (err) {
        console.error('Fehler in useUserStats:', err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserStats();
  }, [userId]);

  const mutate = async (newData: Partial<UserStats>) => {
    if (!userId) return;

    try {
      // Überprüfe die Session vor der Mutation
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        throw new Error('Session-Fehler: ' + sessionError.message);
      }

      if (!session) {
        throw new Error('Keine aktive Session');
      }

      const { data: updatedStats, error: updateError } = await supabase
        .from('user_stats')
        .update(newData)
        .eq('user_id', userId)
        .select()
        .single();

      if (updateError) {
        throw new Error('Fehler beim Aktualisieren der Statistiken');
      }

      setData(updatedStats);
    } catch (err) {
      console.error('Fehler beim Mutieren der Statistiken:', err);
      setError(err as Error);
    }
  };

  return { data, loading, error, mutate };
}; 