import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import { Database } from '../../lib/supabase';
import { queryKeys } from './queryKeys';

type UserStats = Database['public']['Tables']['user_stats']['Row'];

export const useAnswerMutation = (userId: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ isCorrect }: { isCorrect: boolean }) => {
      const { data: currentStats, error: fetchError } = await supabase
        .from('user_stats')
        .select('questions_answered, correct_answers')
        .eq('user_id', userId)
        .single();
        
      if (fetchError) throw fetchError;
      if (!currentStats) throw new Error('Benutzerstatistiken nicht gefunden');
      
      const updates: Partial<UserStats> = {
        questions_answered: (currentStats.questions_answered || 0) + 1
      };
      
      if (isCorrect) {
        updates.correct_answers = (currentStats.correct_answers || 0) + 1;
      }
      
      const { error } = await supabase
        .from('user_stats')
        .update(updates)
        .eq('user_id', userId);
        
      if (error) throw error;
      return { isCorrect };
    },
    onMutate: async ({ isCorrect }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.userStatsByUser(userId) });
      const previousStats = queryClient.getQueryData<UserStats>(queryKeys.userStatsByUser(userId));
      
      if (previousStats) {
        queryClient.setQueryData<UserStats>(queryKeys.userStatsByUser(userId), {
          ...previousStats,
          questions_answered: (previousStats.questions_answered || 0) + 1,
          correct_answers: isCorrect ? (previousStats.correct_answers || 0) + 1 : previousStats.correct_answers
        });
      }
      
      return { previousStats };
    },
    onError: (_, __, context) => {
      if (context?.previousStats) {
        queryClient.setQueryData(queryKeys.userStatsByUser(userId), context.previousStats);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.userStatsByUser(userId) });
    }
  });
};

export const useXpMutation = (userId: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ amount }: { amount: number }) => {
      const { data: currentStats, error: fetchError } = await supabase
        .from('user_stats')
        .select('level, total_xp, total_coins')
        .eq('user_id', userId)
        .single();
        
      if (fetchError) throw fetchError;
      if (!currentStats) throw new Error('Benutzerstatistiken nicht gefunden');
      
      const newXp = (currentStats.total_xp || 0) + amount;
      const currentLevel = currentStats.level || 1;
      const xpForNextLevel = currentLevel * 1000;
      
      const updates: Partial<UserStats> = {
        total_xp: newXp
      };
      
      if (newXp >= xpForNextLevel) {
        updates.level = currentLevel + 1;
        updates.total_coins = (currentStats.total_coins || 0) + 100;
      }
      
      const { error } = await supabase
        .from('user_stats')
        .update(updates)
        .eq('user_id', userId);
        
      if (error) throw error;
      return { newXp, levelUp: newXp >= xpForNextLevel };
    },
    onMutate: async ({ amount }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.userStatsByUser(userId) });
      const previousStats = queryClient.getQueryData<UserStats>(queryKeys.userStatsByUser(userId));
      
      if (previousStats) {
        const newXp = (previousStats.total_xp || 0) + amount;
        const currentLevel = previousStats.level || 1;
        const xpForNextLevel = currentLevel * 1000;
        
        queryClient.setQueryData<UserStats>(queryKeys.userStatsByUser(userId), {
          ...previousStats,
          total_xp: newXp,
          level: newXp >= xpForNextLevel ? currentLevel + 1 : currentLevel,
          total_coins: newXp >= xpForNextLevel ? (previousStats.total_coins || 0) + 100 : previousStats.total_coins
        });
      }
      
      return { previousStats };
    },
    onError: (_, __, context) => {
      if (context?.previousStats) {
        queryClient.setQueryData(queryKeys.userStatsByUser(userId), context.previousStats);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.userStatsByUser(userId) });
    }
  });
}; 