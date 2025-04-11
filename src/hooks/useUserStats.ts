import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { UserStats } from '../lib/supabase';

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
        const { data: stats, error } = await supabase
          .from('user_stats')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (error) throw error;
        setData(stats);
      } catch (err) {
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
      const { data: updatedStats, error } = await supabase
        .from('user_stats')
        .update(newData)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      setData(updatedStats);
    } catch (err) {
      setError(err as Error);
    }
  };

  return { data, loading, error, mutate };
}; 