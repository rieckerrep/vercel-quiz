import { create } from 'zustand';
import { useQuery, useQueryClient, useMutation, QueryKey, QueryFilters } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import { Database, UserStats } from '../types/supabase';
import { userService } from '../api/userService';
import { useEffect } from 'react';
import { User } from '@supabase/supabase-js';

type Profile = Database['public']['Tables']['profiles']['Row'];

// Query Keys
const queryKeys = {
  profile: (userId: string): QueryKey => ['profile', userId],
  stats: (userId: string): QueryKey => ['stats', userId]
};

// React Query Hooks
export const useProfileQuery = (userId: string) => {
  return useQuery({
    queryKey: queryKeys.profile(userId),
    queryFn: async () => {
      if (!userId) {
        throw new Error('Keine gültige Benutzer-ID');
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error('Fehler beim Abrufen des Profils:', error);
        throw error;
      }

      if (!data) {
        throw new Error('Profil nicht gefunden');
      }

      return data;
    },
    enabled: !!userId, // Nur ausführen, wenn userId vorhanden ist
    staleTime: 5 * 60 * 1000, // 5 Minuten
    gcTime: 30 * 60 * 1000    // 30 Minuten
  });
};

export const useUserStatsQuery = (userId: string) => {
  const queryClient = useQueryClient();
  
  return useQuery({
    queryKey: queryKeys.stats(userId),
    queryFn: async () => {
      if (!userId) {
        throw new Error('Keine gültige Benutzer-ID');
      }

      const { data, error } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (error) {
        console.error('Fehler beim Abrufen der Statistiken:', error);
        throw error;
      }

      if (!data) {
        // Erstelle neue Statistiken, falls keine existieren
        const { data: newStats, error: createError } = await supabase
          .from('user_stats')
          .insert({
            user_id: userId,
            total_xp: 0,
            level: 1,
            streak: 0,
            questions_answered: 0,
            correct_answers: 0,
            total_coins: 0
          })
          .select()
          .single();

        if (createError) {
          console.error('Fehler beim Erstellen der Statistiken:', createError);
          throw createError;
        }

        return newStats;
      }

      return data;
    },
    enabled: !!userId, // Nur ausführen, wenn userId vorhanden ist
    staleTime: 1 * 60 * 1000,  // 1 Minute
    gcTime: 5 * 60 * 1000      // 5 Minuten
  });
};

export const useUpdateUserStatsMutation = (userId: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (stats: Partial<UserStats>) => {
      if (!userId) {
        throw new Error('Keine gültige Benutzer-ID');
      }

      const { error } = await supabase
        .from('user_stats')
        .update(stats)
        .eq('user_id', userId);
      
      if (error) {
        console.error('Fehler beim Aktualisieren der Statistiken:', error);
        throw error;
      }

      return stats;
    },
    onMutate: async (newStats) => {
      if (!userId) return;

      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.stats(userId) });
      
      // Snapshot des vorherigen Werts
      const previousStats = queryClient.getQueryData(queryKeys.stats(userId));
      
      // Optimistisches Update
      queryClient.setQueryData(queryKeys.stats(userId), (old: any) => ({
        ...old,
        ...newStats
      }));
      
      return { previousStats };
    },
    onError: (err, newStats, context) => {
      console.error('Fehler bei der Mutation:', err);
      // Bei Fehler zurücksetzen
      if (context?.previousStats) {
        queryClient.setQueryData(queryKeys.stats(userId), context.previousStats);
      }
    },
    onSettled: () => {
      if (!userId) return;
      // Nach Erfolg oder Fehler neu validieren
      queryClient.invalidateQueries({ queryKey: queryKeys.stats(userId) });
    }
  });
};

// Zustand Store (für UI State und lokale Werte)
interface UserState {
  user: User | null;
  userStats: UserStats | null;
  totalXp: number;
  totalCoins: number;
  level: number;
  isLoading: boolean;
  error: Error | null;
  fetchUser: () => Promise<void>;
  fetchUserStats: () => Promise<void>;
  addXp: (amount: number) => Promise<void>;
  addCoins: (amount: number) => Promise<void>;
  resetUser: () => void;
  setTotalXp: (amount: number) => void;
  setTotalCoins: (amount: number) => void;
  setLevel: (level: number) => void;
  incrementAnsweredQuestions: () => Promise<void>;
  incrementCorrectAnswers: () => Promise<void>;
  addToTotalXp: (amount: number) => Promise<void>;
  addToTotalCoins: (amount: number) => Promise<void>;
}

const useUserStore = create<UserState>((setState) => ({
  user: null,
  userStats: null,
  totalXp: 0,
  totalCoins: 0,
  level: 1,
  isLoading: false,
  error: null,
  fetchUser: async () => {
    try {
      setState({ isLoading: true });
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      setState({ user });
    } catch (error) {
      setState({ error: error as Error });
    } finally {
      setState({ isLoading: false });
    }
  },
  fetchUserStats: async () => {
    try {
      setState({ isLoading: true });
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: stats, error } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setState({ 
        userStats: stats,
        totalXp: stats?.total_xp || 0,
        totalCoins: stats?.total_coins || 0,
        level: stats?.level || 1
      });
    } catch (error) {
      setState({ error: error as Error });
    } finally {
      setState({ isLoading: false });
    }
  },
  addXp: async (amount) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: currentStats, error: fetchError } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (fetchError) throw fetchError;

    const newTotalXp = (currentStats?.total_xp || 0) + amount;

    const { error } = await supabase
      .from('user_stats')
      .update({ 
        total_xp: newTotalXp,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    if (error) throw error;

    const { data: levelData, error: levelError } = await supabase
      .rpc('update_level_on_xp_change', {
        p_user_id: user.id,
        p_new_xp: newTotalXp
      });

    if (levelError) {
      console.error('Fehler beim Level-Update:', levelError);
    }

    setState((state) => ({
      totalXp: newTotalXp,
      level: levelData?.new_level || state.level
    }));
  },
  addCoins: async (amount) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: currentStats, error: fetchError } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (fetchError) throw fetchError;

    const newTotalCoins = (currentStats?.total_coins || 0) + amount;

    const { error } = await supabase
      .from('user_stats')
      .update({ 
        total_coins: newTotalCoins,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    if (error) throw error;

    setState({ totalCoins: newTotalCoins });
  },
  resetUser: () => {
    setState({
      user: null,
      userStats: null,
      totalXp: 0,
      totalCoins: 0,
      level: 1,
      isLoading: false,
      error: null
    });
  },
  setTotalXp: (amount) => {
    setState({ totalXp: amount });
  },
  setTotalCoins: (amount) => {
    setState({ totalCoins: amount });
  },
  setLevel: (level) => {
    setState({ level });
  },
  incrementAnsweredQuestions: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: currentStats, error: fetchError } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (fetchError) throw fetchError;

    const newQuestionsAnswered = (currentStats?.questions_answered || 0) + 1;

    const { error } = await supabase
      .from('user_stats')
      .update({ 
        questions_answered: newQuestionsAnswered,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    if (error) throw error;
  },
  incrementCorrectAnswers: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: currentStats, error: fetchError } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (fetchError) throw fetchError;

    const newCorrectAnswers = (currentStats?.correct_answers || 0) + 1;

    const { error } = await supabase
      .from('user_stats')
      .update({ 
        correct_answers: newCorrectAnswers,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    if (error) throw error;
  },
  addToTotalXp: async (amount) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: currentStats, error: fetchError } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (fetchError) throw fetchError;

    const newTotalXp = (currentStats?.total_xp || 0) + amount;

    const { error } = await supabase
      .from('user_stats')
      .update({ 
        total_xp: newTotalXp,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    if (error) throw error;

    setState({ totalXp: newTotalXp });
  },
  addToTotalCoins: async (amount) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: currentStats, error: fetchError } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (fetchError) throw fetchError;

    const newTotalCoins = (currentStats?.total_coins || 0) + amount;

    const { error } = await supabase
      .from('user_stats')
      .update({ 
        total_coins: newTotalCoins,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    if (error) throw error;

    setState({ totalCoins: newTotalCoins });
  }
}));

// Hilfsfunktionen für die alte API
export const useUserData = (userId: string) => {
  const profileQuery = useProfileQuery(userId);
  const statsQuery = useUserStatsQuery(userId);
  const updateStatsMutation = useUpdateUserStatsMutation(userId);
  const store = useUserStore();

  // Synchronisiere lokale Werte mit Query-Daten
  useEffect(() => {
    if (statsQuery.data) {
      const currentTotalXp = store.totalXp;
      const currentTotalCoins = store.totalCoins;
      
      // Nur aktualisieren, wenn sich die Werte tatsächlich geändert haben
      if (currentTotalXp !== statsQuery.data.total_xp) {
        store.setTotalXp(statsQuery.data.total_xp || 0);
      }
      if (currentTotalCoins !== statsQuery.data.total_coins) {
        store.setTotalCoins(statsQuery.data.total_coins || 0);
      }
    }
  }, [statsQuery.data]); // store aus der Dependency-Liste entfernt

  return {
    profile: profileQuery.data,
    userStats: statsQuery.data,
    isLoading: profileQuery.isLoading || statsQuery.isLoading,
    error: profileQuery.error || statsQuery.error,
    
    // Alte API-Funktionen
    loadUserData: async () => {
      await Promise.all([
        profileQuery.refetch(),
        statsQuery.refetch()
      ]);
    },
    
    fetchProfile: () => profileQuery.refetch(),
    fetchUserStats: () => statsQuery.refetch(),
    
    updateUserStats: async (stats: Partial<UserStats>) => {
      await updateStatsMutation.mutateAsync(stats);
    },
    
    incrementAnsweredQuestions: async () => {
      const currentStats = statsQuery.data;
      if (!currentStats) return;
      
      await updateStatsMutation.mutateAsync({
        questions_answered: (currentStats.questions_answered || 0) + 1
      });
    },
    
    incrementCorrectAnswers: async () => {
      const currentStats = statsQuery.data;
      if (!currentStats) return;
      
      await updateStatsMutation.mutateAsync({
        correct_answers: (currentStats.correct_answers || 0) + 1
      });
    },
    
    addXp: async (amount: number) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Aktuelle Statistiken abrufen
      const { data: currentStats, error: fetchError } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (fetchError) throw fetchError;

      // Berechne neue Werte
      const newTotalXp = (currentStats?.total_xp || 0) + amount;

      // Aktualisiere die Statistiken
      const { error } = await supabase
        .from('user_stats')
        .update({ 
          total_xp: newTotalXp,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) throw error;

      // Level-Update durchführen
      const { data: levelData, error: levelError } = await supabase
        .rpc('update_level_on_xp_change', {
          p_user_id: user.id,
          p_new_xp: newTotalXp
        });

      if (levelError) {
        console.error('Fehler beim Level-Update:', levelError);
      }

      // Aktualisiere den lokalen State
      store.setTotalXp(newTotalXp);
      if (levelData?.new_level) {
        store.setLevel(levelData.new_level);
      }
    },
    
    addCoins: async (amount: number) => {
      const currentStats = statsQuery.data;
      if (!currentStats) return;
      
      await updateStatsMutation.mutateAsync({
        total_coins: (currentStats.total_coins || 0) + amount
      });
    }
  };
};

export { useUserStore };
export default useUserStore; 