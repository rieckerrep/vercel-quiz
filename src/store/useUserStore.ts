import { create } from 'zustand';
import { useQuery, useQueryClient, useMutation, QueryKey, QueryFilters } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import { Database } from '../lib/supabase';
import { userService } from '../api/userService';
import { useEffect } from 'react';

type Profile = Database['public']['Tables']['profiles']['Row'];
type UserStats = Database['public']['Tables']['user_stats']['Row'];

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
  isLoading: boolean;
  error: string | null;
  totalXp: number;
  totalCoins: number;
  userStats: UserStats | null;
  profile: Profile | null;
  setTotalXp: (xp: number) => void;
  setTotalCoins: (coins: number) => void;
  addToTotalXp: (xp: number) => void;
  addToTotalCoins: (coins: number) => void;
  addXp: (amount: number) => Promise<void>;
  addCoins: (amount: number) => Promise<void>;
  incrementAnsweredQuestions: () => Promise<void>;
  incrementCorrectAnswers: () => Promise<void>;
  fetchUserStats: (userId: string) => Promise<void>;
  loadUserData: (userId: string) => Promise<void>;
}

export const useUserStore = create<UserState>((set, get) => ({
  isLoading: false,
  error: null,
  totalXp: 0,
  totalCoins: 0,
  userStats: null,
  profile: null,
  setTotalXp: (xp: number) => set({ totalXp: xp }),
  setTotalCoins: (coins: number) => set({ totalCoins: coins }),
  addToTotalXp: (xp: number) => set(state => ({ totalXp: state.totalXp + xp })),
  addToTotalCoins: (coins: number) => set(state => ({ totalCoins: state.totalCoins + coins })),
  addXp: async (amount: number) => {
    const { userStats } = get();
    if (!userStats) return;
    
    const newXp = (userStats.total_xp || 0) + amount;
    set({ totalXp: newXp });
    
    // Level-Up prüfen
    const currentLevel = userStats.level || 1;
    const xpForNextLevel = currentLevel * 1000;
    
    if (newXp >= xpForNextLevel) {
      set({ 
        totalCoins: (userStats.total_coins || 0) + 100,
        userStats: { ...userStats, level: currentLevel + 1 }
      });
    }
  },
  addCoins: async (amount: number) => {
    const { userStats } = get();
    if (!userStats) return;
    
    set({ 
      totalCoins: (userStats.total_coins || 0) + amount,
      userStats: { ...userStats, total_coins: (userStats.total_coins || 0) + amount }
    });
  },
  incrementAnsweredQuestions: async () => {
    const { userStats } = get();
    if (!userStats) return;
    
    set({ 
      userStats: { 
        ...userStats, 
        questions_answered: (userStats.questions_answered || 0) + 1 
      }
    });
  },
  incrementCorrectAnswers: async () => {
    const { userStats } = get();
    if (!userStats) return;
    
    set({ 
      userStats: { 
        ...userStats, 
        correct_answers: (userStats.correct_answers || 0) + 1 
      }
    });
  },
  fetchUserStats: async (userId: string) => {
    const { data, error } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error) {
      set({ error: error.message });
      return;
    }
    
    set({ 
      userStats: data,
      totalXp: data.total_xp || 0,
      totalCoins: data.total_coins || 0
    });
  },
  loadUserData: async (userId: string) => {
    set({ isLoading: true, error: null });
    try {
      // Lade Profil
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;

      // Lade Statistiken
      const { data: statsData, error: statsError } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (statsError) {
        // Wenn keine Statistiken gefunden wurden, erstelle neue
        if (statsError.code === 'PGRST116') {
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

          if (createError) throw createError;
          set({ 
            profile: profileData,
            userStats: newStats,
            totalXp: 0,
            totalCoins: 0,
            isLoading: false 
          });
          return;
        }
        throw statsError;
      }

      set({ 
        profile: profileData,
        userStats: statsData,
        totalXp: statsData?.total_xp || 0,
        totalCoins: statsData?.total_coins || 0,
        isLoading: false
      });
    } catch (error: any) {
      set({ 
        error: error.message || 'Ein Fehler ist aufgetreten',
        isLoading: false 
      });
    }
  }
}));

// Hilfsfunktionen für die alte API
export const useUserData = (userId: string) => {
  const profileQuery = useProfileQuery(userId);
  const statsQuery = useUserStatsQuery(userId);
  const updateStatsMutation = useUpdateUserStatsMutation(userId);
  const { setTotalXp, setTotalCoins } = useUserStore();

  // Synchronisiere lokale Werte mit Query-Daten
  useEffect(() => {
    if (statsQuery.data) {
      setTotalXp(statsQuery.data.total_xp || 0);
      setTotalCoins(statsQuery.data.total_coins || 0);
    }
  }, [statsQuery.data, setTotalXp, setTotalCoins]);

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
      const currentStats = statsQuery.data;
      if (!currentStats) return;
      
      await updateStatsMutation.mutateAsync({
        total_xp: (currentStats.total_xp || 0) + amount
      });
      
      // Level-Up prüfen
      const currentLevel = currentStats.level || 1;
      const xpForNextLevel = currentLevel * 1000;
      
      if ((currentStats.total_xp || 0) + amount >= xpForNextLevel) {
        await updateStatsMutation.mutateAsync({
          level: currentLevel + 1,
          total_coins: (currentStats.total_coins || 0) + 100
        });
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