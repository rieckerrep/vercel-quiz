import { supabase } from '../supabaseClient';
import { apiCall, ApiResponse } from './apiClient';
import { Database } from '../types/supabase';
import { ERROR_MESSAGES } from '../constants/errorMessages';
import { notificationService } from '../services/notificationService';

type Profile = Database['public']['Tables']['profiles']['Row'];
type UserStats = Database['public']['Tables']['user_stats']['Row'];
type Level = Database['public']['Tables']['levels']['Row'];
type League = Database['public']['Tables']['leagues']['Row'];
type LeaguePosition = Database['public']['Tables']['league_positions']['Row'];
type University = Database['public']['Tables']['universities']['Row'];

/**
 * Benutzerdienst für Profil, Statistiken und Belohnungen
 */
export const userService = {
  /**
   * Benutzerprofil abrufen
   */
  fetchProfile: async (userId: string): Promise<ApiResponse<Profile>> => {
    return apiCall(async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      return { data, error };
    });
  },

  /**
   * Benutzerprofil aktualisieren
   */
  updateProfile: async (userId: string, updateData: Partial<Profile>): Promise<ApiResponse<Profile>> => {
    return apiCall(async () => {
      const { data, error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', userId)
        .select()
        .single();

      return { data, error };
    });
  },

  /**
   * Benutzerstatistiken abrufen
   */
  fetchUserStats: async (userId: string): Promise<ApiResponse<UserStats>> => {
    return apiCall(async () => {
      const { data, error } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', userId)
        .single();

      return { data, error };
    });
  },

  /**
   * Benutzerstatistiken aktualisieren
   */
  updateUserStats: async (userId: string, updateData: Partial<UserStats>): Promise<ApiResponse<UserStats>> => {
    return apiCall(async () => {
      const { data, error } = await supabase
        .from('user_stats')
        .update(updateData)
        .eq('user_id', userId)
        .select()
        .single();

      return { data, error };
    });
  },

  /**
   * XP hinzufügen
   */
  addXp: async (userId: string, xpAmount: number): Promise<ApiResponse<UserStats>> => {
    return apiCall(async () => {
      // Aktuelle Statistiken abrufen
      const { data: currentStats, error: fetchError } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (fetchError) {
        return { data: null, error: fetchError };
      }

      if (!currentStats) {
        return { data: null, error: new Error('Benutzerstatistiken nicht gefunden') };
      }

      // Neue XP berechnen
      const newTotalXp = (currentStats.total_xp || 0) + xpAmount;
      
      // Statistiken aktualisieren
      const { data, error } = await supabase
        .from('user_stats')
        .update({ total_xp: newTotalXp })
        .eq('user_id', userId)
        .select()
        .single();

      return { data, error };
    });
  },

  /**
   * Münzen hinzufügen
   */
  addCoins: async (userId: string, coinsAmount: number): Promise<ApiResponse<UserStats>> => {
    return apiCall(async () => {
      // Aktuelle Statistiken abrufen
      const { data: currentStats, error: fetchError } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (fetchError) {
        return { data: null, error: fetchError };
      }

      if (!currentStats) {
        return { data: null, error: new Error('Benutzerstatistiken nicht gefunden') };
      }

      // Neue Münzen berechnen
      const newTotalCoins = (currentStats.total_coins || 0) + coinsAmount;
      
      // Statistiken aktualisieren
      const { data, error } = await supabase
        .from('user_stats')
        .update({ total_coins: newTotalCoins })
        .eq('user_id', userId)
        .select()
        .single();

      return { data, error };
    });
  },

  /**
   * Beantwortete Fragen erhöhen
   */
  incrementAnsweredQuestions: async (userId: string): Promise<ApiResponse<UserStats>> => {
    return apiCall(async () => {
      try {
        // Aktuelle Statistiken abrufen
        const { data: currentStats, error: fetchError } = await supabase
          .from('user_stats')
          .select('questions_answered')
          .eq('user_id', userId)
          .single();

        if (fetchError) {
          notificationService.error(ERROR_MESSAGES.USER.STATS_UPDATE);
          console.error('Fehler beim Abrufen der Statistiken:', fetchError);
          return { data: null, error: fetchError };
        }

        if (!currentStats) {
          notificationService.error(ERROR_MESSAGES.USER.STATS_UPDATE);
          return { data: null, error: new Error('Benutzerstatistiken nicht gefunden') };
        }

        // Neue Anzahl berechnen
        const newAnsweredQuestions = (currentStats.questions_answered || 0) + 1;
        
        // Statistiken aktualisieren
        const { data, error } = await supabase
          .from('user_stats')
          .update({ questions_answered: newAnsweredQuestions })
          .eq('user_id', userId)
          .select()
          .single();

        if (error) {
          notificationService.error(ERROR_MESSAGES.USER.STATS_UPDATE);
          console.error('Fehler beim Aktualisieren der Statistiken:', error);
        } else {
          notificationService.success(ERROR_MESSAGES.SUCCESS.STATS_UPDATED);
        }

        return { data, error };
      } catch (error) {
        notificationService.error(ERROR_MESSAGES.GENERAL.UNKNOWN);
        console.error('Unerwarteter Fehler bei der Statistikaktualisierung:', error);
        return { data: null, error: error as Error };
      }
    });
  },

  /**
   * Richtige Antworten erhöhen
   */
  incrementCorrectAnswers: async (userId: string): Promise<ApiResponse<UserStats>> => {
    return apiCall(async () => {
      try {
        // Aktuelle Statistiken abrufen
        const { data: currentStats, error: fetchError } = await supabase
          .from('user_stats')
          .select('correct_answers')
          .eq('user_id', userId)
          .single();

        if (fetchError) {
          notificationService.error(ERROR_MESSAGES.USER.STATS_UPDATE);
          console.error('Fehler beim Abrufen der Statistiken:', fetchError);
          return { data: null, error: fetchError };
        }

        if (!currentStats) {
          notificationService.error(ERROR_MESSAGES.USER.STATS_UPDATE);
          return { data: null, error: new Error('Benutzerstatistiken nicht gefunden') };
        }

        // Neue Anzahl berechnen
        const newCorrectAnswers = (currentStats.correct_answers || 0) + 1;
        
        // Statistiken aktualisieren
        const { data, error } = await supabase
          .from('user_stats')
          .update({ correct_answers: newCorrectAnswers })
          .eq('user_id', userId)
          .select()
          .single();

        if (error) {
          notificationService.error(ERROR_MESSAGES.USER.STATS_UPDATE);
          console.error('Fehler beim Aktualisieren der Statistiken:', error);
        } else {
          notificationService.success(ERROR_MESSAGES.SUCCESS.STATS_UPDATED);
        }

        return { data, error };
      } catch (error) {
        notificationService.error(ERROR_MESSAGES.GENERAL.UNKNOWN);
        console.error('Unerwarteter Fehler bei der Statistikaktualisierung:', error);
        return { data: null, error: error as Error };
      }
    });
  },

  /**
   * Quiz-Abschluss protokollieren
   */
  logQuizCompleted: async (
    userId: string, 
    totalXp: number, 
    possibleXp: number, 
    medal: string, 
    answeredCount: number, 
    correctCount: number
  ): Promise<ApiResponse<{ success: boolean }>> => {
    return apiCall(async () => {
      // Aktuelle Statistiken abrufen
      const { data: currentStats, error: fetchError } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (fetchError) {
        return { data: null, error: fetchError };
      }

      if (!currentStats) {
        return { data: null, error: new Error('Benutzerstatistiken nicht gefunden') };
      }

      // Neue Werte berechnen
      const newTotalXp = (currentStats.total_xp || 0) + totalXp;
      const newQuizzesCompleted = (currentStats.quizzes_completed || 0) + 1;
      
      // Update-Objekt erstellen
      const updateData: any = {
        total_xp: newTotalXp,
        quizzes_completed: newQuizzesCompleted
      };
      
      // Medaille hinzufügen, falls vorhanden
      if (medal === 'gold') {
        updateData.gold_medals = (currentStats.gold_medals || 0) + 1;
      } else if (medal === 'silver') {
        updateData.silver_medals = (currentStats.silver_medals || 0) + 1;
      } else if (medal === 'bronze') {
        updateData.bronze_medals = (currentStats.bronze_medals || 0) + 1;
      }
      
      // Statistiken aktualisieren
      const { error } = await supabase
        .from('user_stats')
        .update(updateData)
        .eq('user_id', userId);

      if (error) {
        return { data: null, error };
      }
      
      // Quiz-Abschluss in der Datenbank protokollieren
      const { error: logError } = await supabase
        .from('quiz_completions')
        .insert([
          {
            user_id: userId,
            total_xp: totalXp,
            possible_xp: possibleXp,
            medal: medal,
            answered_count: answeredCount,
            correct_count: correctCount,
            completed_at: new Date().toISOString()
          }
        ]);
        
      if (logError) {
        return { data: null, error: logError };
      }
      
      return { data: { success: true }, error: null };
    });
  },

  /**
   * Level abrufen
   */
  fetchLevels: async (): Promise<ApiResponse<Level[]>> => {
    return apiCall(async () => {
      const { data, error } = await supabase
        .from('levels')
        .select('*')
        .order('level_number');

      return { data, error };
    });
  },

  /**
   * Ligen abrufen
   */
  fetchLeagues: async (): Promise<ApiResponse<League[]>> => {
    return apiCall(async () => {
      const { data, error } = await supabase.from('leagues').select('*');

      return { data, error };
    });
  },

  /**
   * Ligapositionen eines Benutzers abrufen
   */
  fetchLeaguePositions: async (userId: string): Promise<ApiResponse<LeaguePosition[]>> => {
    return apiCall(async () => {
      const { data, error } = await supabase
        .from('league_positions')
        .select('*')
        .eq('user_id', userId);

      return { data, error };
    });
  },

  /**
   * Ligaposition aktualisieren
   */
  updateLeaguePosition: async (
    userId: string,
    leagueName: string,
    points: number,
    ranking: number
  ): Promise<ApiResponse<LeaguePosition>> => {
    return apiCall(async () => {
      const { data, error } = await supabase
        .from('league_positions')
        .upsert({
          user_id: userId,
          league_name: leagueName,
          points,
          ranking,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      return { data, error };
    });
  },

  /**
   * Universitäten abrufen
   */
  fetchUniversities: async (): Promise<ApiResponse<University[]>> => {
    return apiCall(async () => {
      const { data, error } = await supabase
        .from('universities')
        .select('*')
        .order('name');

      return { data, error };
    });
  },

  /**
   * Universitäts-Rangliste abrufen
   */
  fetchUniversityLeaderboard: async (): Promise<ApiResponse<any[]>> => {
    return apiCall(async () => {
      const { data, error } = await supabase.rpc('get_university_leaderboard');

      return { data, error };
    });
  },

  /**
   * Spieler-Rangliste abrufen
   */
  fetchPlayerLeaderboard: async (): Promise<ApiResponse<any[]>> => {
    return apiCall(async () => {
      const { data, error } = await supabase.rpc('get_player_leaderboard');

      return { data, error };
    });
  },

  /**
   * Liga-Rangliste abrufen
   */
  fetchLeagueLeaderboard: async (leagueName: string): Promise<ApiResponse<any[]>> => {
    return apiCall(async () => {
      const { data, error } = await supabase.rpc('get_league_leaderboard', {
        league_name: leagueName
      });

      return { data, error };
    });
  },

  /**
   * Fächerübersicht für einen Benutzer abrufen
   */
  fetchSubjectBreakdown: async (userId: string): Promise<ApiResponse<any[]>> => {
    return apiCall(async () => {
      const { data, error } = await supabase.rpc('get_subject_breakdown_for_user', {
        user_id: userId
      });

      return { data, error };
    });
  },
};

export default userService; 