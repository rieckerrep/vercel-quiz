import { create } from 'zustand';
import { supabase } from '../supabaseClient';
import { Database } from '../types/supabase';
import { userService } from '../api/userService';

type Profile = Database['public']['Tables']['profiles']['Row'];
type UserStats = Database['public']['Tables']['user_stats']['Row'];

interface UserState {
  profile: Profile | null;
  userStats: UserStats | null;
  isLoading: boolean;
  error: string | null;
  
  // Lade-Funktionen
  loadUserData: (userId: string) => Promise<void>;
  fetchProfile: (userId: string) => Promise<void>;
  fetchUserStats: (userId: string) => Promise<void>;
  
  // Update-Funktionen
  updateUserStats: (stats: Partial<UserStats>) => Promise<void>;
  incrementAnsweredQuestions: () => Promise<void>;
  incrementCorrectAnswers: () => Promise<void>;
  addXp: (amount: number) => Promise<void>;
  addCoins: (amount: number) => Promise<void>;
  checkLevelUp: () => Promise<boolean>;
  totalXp: number;
  totalCoins: number;
  setTotalXp: (xp: number) => void;
  setTotalCoins: (coins: number) => void;
  addToTotalXp: (xp: number) => void;
  addToTotalCoins: (coins: number) => void;
}

export const useUserStore = create<UserState>((set, get) => ({
  profile: null,
  userStats: null,
  isLoading: false,
  error: null,
  totalXp: 0,
  totalCoins: 0,
  setTotalXp: (xp: number) => set({ totalXp: xp }),
  setTotalCoins: (coins: number) => set({ totalCoins: coins }),
  addToTotalXp: (xp: number) => set(state => ({ totalXp: state.totalXp + xp })),
  addToTotalCoins: (coins: number) => set(state => ({ totalCoins: state.totalCoins + coins })),

  loadUserData: async (userId: string) => {
    const state = get();
    // Wenn bereits Daten geladen werden, nicht erneut laden
    if (state.isLoading) return;
    
    // Wenn bereits Daten vorhanden sind und kein Fehler existiert, nicht erneut laden
    if (state.profile && state.userStats && !state.error) return;

    set({ isLoading: true, error: null });
    try {
      // Profil laden
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;
      
      // Statistiken laden
      const { data: userStats, error: statsError } = await userService.fetchUserStats(userId);
      if (statsError) throw statsError;
      
      // Alle Daten auf einmal setzen
      set({ 
        profile: profileData,
        userStats,
        totalXp: userStats?.total_xp || 0,
        totalCoins: userStats?.total_coins || 0,
        error: null,
        isLoading: false
      });
    } catch (error) {
      console.error('Fehler beim Laden der Benutzerdaten:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Fehler beim Laden der Benutzerdaten',
        isLoading: false 
      });
    }
  },

  fetchProfile: async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      set({ profile: data });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Fehler beim Laden des Profils' });
    }
  },

  fetchUserStats: async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      set({ userStats: data });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Fehler beim Laden der Statistiken' });
    }
  },

  updateUserStats: async (stats: Partial<UserStats>) => {
    const { userStats } = get();
    if (!userStats) return;

    try {
      const { error } = await supabase
        .from('user_stats')
        .update(stats)
        .eq('user_id', userStats.user_id);

      if (error) throw error;
      set({ userStats: { ...userStats, ...stats } });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Fehler beim Aktualisieren der Statistiken' });
    }
  },

  incrementAnsweredQuestions: async () => {
    const { userStats } = get();
    if (!userStats) return;

    await get().updateUserStats({
      questions_answered: (userStats.questions_answered || 0) + 1
    });
  },

  incrementCorrectAnswers: async () => {
    const { userStats } = get();
    if (!userStats) return;

    await get().updateUserStats({
      correct_answers: (userStats.correct_answers || 0) + 1
    });
  },

  addXp: async (amount: number) => {
    const { userStats } = get();
    if (!userStats) return;

    await get().updateUserStats({
      total_xp: (userStats.total_xp || 0) + amount
    });

    await get().checkLevelUp();
  },

  addCoins: async (amount: number) => {
    const { userStats } = get();
    if (!userStats) return;

    await get().updateUserStats({
      total_coins: (userStats.total_coins || 0) + amount
    });
  },

  checkLevelUp: async () => {
    const { userStats } = get();
    if (!userStats || userStats.total_xp === null) return false;

    const currentLevel = userStats.level || 1;
    const xpForNextLevel = currentLevel * 1000;

    if (userStats.total_xp >= xpForNextLevel) {
      await get().updateUserStats({
        level: currentLevel + 1,
        total_coins: (userStats.total_coins || 0) + 100 // Bonus-Münzen für Level-Up
      });
      return true;
    }
    return false;
  }
})); 