import { create } from 'zustand';
import { supabase } from '../supabaseClient';
import { Database } from '../types/supabase';

type Profile = Database['public']['Tables']['profiles']['Row'];
type UserStats = Database['public']['Tables']['user_stats']['Row'];

interface UserState {
  profile: Profile | null;
  userStats: UserStats | null;
  isLoading: boolean;
  error: string | null;
  fetchProfile: (userId: string) => Promise<void>;
  fetchUserStats: (userId: string) => Promise<void>;
  updateUserStats: (userId: string, updates: Partial<UserStats>) => Promise<void>;
  incrementQuestionsAnswered: (userId: string) => Promise<void>;
  incrementCorrectAnswers: (userId: string) => Promise<boolean>;
  addXP: (userId: string, amount: number) => Promise<boolean>;
  addCoins: (userId: string, amount: number) => Promise<void>;
  checkLevelUp: (userId: string, newXP: number) => Promise<boolean>;
}

export const useUserStore = create<UserState>((set, get) => ({
  profile: null,
  userStats: null,
  isLoading: false,
  error: null,

  fetchProfile: async (userId: string) => {
    try {
      set({ isLoading: true, error: null });
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      set({ profile: data });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Ein Fehler ist aufgetreten' });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchUserStats: async (userId: string) => {
    try {
      set({ isLoading: true, error: null });
      const { data, error } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      set({ userStats: data });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Ein Fehler ist aufgetreten' });
    } finally {
      set({ isLoading: false });
    }
  },

  updateUserStats: async (userId: string, updates: Partial<UserStats>) => {
    try {
      set({ isLoading: true, error: null });
      const { data, error } = await supabase
        .from('user_stats')
        .update({
          ...updates,
          last_played: new Date().toISOString()
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      set({ userStats: data });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Ein Fehler ist aufgetreten' });
    } finally {
      set({ isLoading: false });
    }
  },

  incrementQuestionsAnswered: async (userId: string) => {
    const { userStats } = get();
    if (!userStats) return;

    await get().updateUserStats(userId, {
      questions_answered: (userStats.questions_answered || 0) + 1
    });
  },

  incrementCorrectAnswers: async (userId: string) => {
    const { userStats } = get();
    if (!userStats) return false;

    const newCorrectAnswers = (userStats.correct_answers || 0) + 1;
    const newXP = (userStats.total_xp || 0) + 10;

    // Aktualisiere die Statistiken
    const { error } = await supabase
      .from('user_stats')
      .update({
        correct_answers: newCorrectAnswers,
        total_xp: newXP
      })
      .eq('user_id', userId);

    if (error) {
      console.error('Fehler beim Aktualisieren der Statistiken:', error);
      return false;
    }

    // Aktualisiere den lokalen State
    set(state => ({
      userStats: state.userStats ? {
        ...state.userStats,
        correct_answers: newCorrectAnswers,
        total_xp: newXP
      } : null
    }));

    // Prüfe auf Level-Up
    return await get().checkLevelUp(userId, newXP);
  },

  addXP: async (userId: string, amount: number) => {
    const { userStats } = get();
    if (!userStats) return false;

    const newXP = (userStats.total_xp || 0) + amount;
    
    // Aktualisiere XP in der Datenbank
    const { error } = await supabase
      .from('user_stats')
      .update({ total_xp: newXP })
      .eq('user_id', userId);

    if (error) {
      console.error('Fehler beim Aktualisieren der XP:', error);
      return false;
    }

    // Aktualisiere den lokalen State
    set(state => ({
      userStats: state.userStats ? { ...state.userStats, total_xp: newXP } : null
    }));

    // Prüfe auf Level-Up
    return await get().checkLevelUp(userId, newXP);
  },

  addCoins: async (userId: string, amount: number) => {
    const { userStats } = get();
    if (!userStats) return;

    await get().updateUserStats(userId, {
      total_coins: Math.max(0, (userStats.total_coins || 0) + amount)
    });
  },

  checkLevelUp: async (userId: string, newXP: number) => {
    const { userStats } = get();
    if (!userStats || userStats.total_xp === null) return false;

    // Berechne das aktuelle Level basierend auf XP
    const currentLevel = Math.floor(Math.sqrt(userStats.total_xp / 100));
    const newLevel = Math.floor(Math.sqrt(newXP / 100));

    // Wenn das Level gestiegen ist
    if (newLevel > currentLevel) {
      // Aktualisiere das Level in der Datenbank
      const { error } = await supabase
        .from('user_stats')
        .update({ level: newLevel })
        .eq('user_id', userId);

      if (error) {
        console.error('Fehler beim Aktualisieren des Levels:', error);
        return false;
      }

      // Aktualisiere den lokalen State
      set(state => ({
        userStats: state.userStats ? { ...state.userStats, level: newLevel } : null
      }));

      return true;
    }

    return false;
  }
})); 