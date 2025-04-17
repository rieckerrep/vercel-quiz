import { supabase } from '../lib/supabaseClient';
import { apiCall, ApiResponse } from './apiClient';
import { Database, SubmitAnswerResult, SubmitAnswerArgs, RpcFunction } from '../types/supabase';
import { ERROR_MESSAGES } from '../constants/errorMessages';
import { notificationService } from '../services/notificationService';
import { RpcReturnType, RpcArgs } from '../types/rpc';

type Tables = Database['public']['Tables'];
type Functions = Database['public']['Functions'];

interface DatabaseProfile {
  id: string;
  username: string | null;
  avatar_url: string | null;
  created_at: string;
  university: string | null;
}

interface DatabaseUserStats {
  id: string;
  user_id: string;
  total_xp: number | null;
  total_coins: number | null;
  level: number | null;
  streak: number | null;
  questions_answered: number | null;
  correct_answers: number | null;
  last_played: string | null;
  bronze_medals: number | null;
  silver_medals: number | null;
  gold_medals: number | null;
}

interface DatabaseLevel {
  id: number;
  level_number: number;
  level_title: string | null;
  level_image: string | null;
  xp_required: number;
}

interface DatabaseLeague {
  id: number;
  name: string;
  league_img: string | null;
}

interface DatabaseLeaguePosition {
  user_id: string;
  league_name: string;
  points: number | null;
  ranking: number | null;
  updated_at: string | null;
}

interface DatabaseUniversity {
  id: number;
  name: string;
  created_at: string | null;
  xp_total: number | null;
}

type ProfileUpdate = Partial<DatabaseProfile>;
type UserStatsUpdate = Partial<DatabaseUserStats>;

type SubmitAnswerResponse = {
  xp_awarded: number;
  coins_awarded: number;
  new_progress: number;
  streak: number;
};

/**
 * Benutzerdienst für Profil, Statistiken und Belohnungen
 */
export const userService = {
  /**
   * Benutzerprofil abrufen
   */
  fetchProfile: async (userId: string): Promise<ApiResponse<DatabaseProfile>> => {
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
  updateProfile: async (userId: string, updates: ProfileUpdate): Promise<ApiResponse<DatabaseProfile>> => {
    return apiCall(async () => {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      return { data, error };
    });
  },

  /**
   * Benutzerstatistiken abrufen
   */
  fetchUserStats: async (userId: string): Promise<ApiResponse<DatabaseUserStats>> => {
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
  updateUserStats: async (userId: string, updates: UserStatsUpdate): Promise<ApiResponse<DatabaseUserStats>> => {
    return apiCall(async () => {
      const { data, error } = await supabase
        .from('user_stats')
        .update(updates)
        .eq('user_id', userId)
        .select()
        .single();

      return { data, error };
    });
  },

  /**
   * XP hinzufügen
   */
  addXp: async (userId: string, xpAmount: number): Promise<ApiResponse<DatabaseUserStats>> => {
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
  addCoins: async (userId: string, coinsAmount: number): Promise<ApiResponse<DatabaseUserStats>> => {
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
  incrementAnsweredQuestions: async (userId: string): Promise<ApiResponse<DatabaseUserStats>> => {
    return apiCall(async () => {
      try {
        // Aktuelle Statistiken abrufen
        const { data: currentStats, error: fetchError } = await supabase
          .from('user_stats')
          .select('questions_answered')
          .eq('user_id', userId)
          .single();

        if (fetchError) {
          console.error('Fehler beim Abrufen der Statistiken:', fetchError);
          return { data: null, error: fetchError };
        }

        if (!currentStats) {
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
          console.error('Fehler beim Aktualisieren der Statistiken:', error);
        }

        return { data, error };
      } catch (error) {
        console.error('Unerwarteter Fehler bei der Statistikaktualisierung:', error);
        return { data: null, error: error as Error };
      }
    });
  },

  /**
   * Richtige Antworten erhöhen
   */
  incrementCorrectAnswers: async (userId: string): Promise<ApiResponse<DatabaseUserStats>> => {
    return apiCall(async () => {
      try {
        // Aktuelle Statistiken abrufen
        const { data: currentStats, error: fetchError } = await supabase
          .from('user_stats')
          .select('correct_answers')
          .eq('user_id', userId)
          .single();

        if (fetchError) {
          console.error('Fehler beim Abrufen der Statistiken:', fetchError);
          return { data: null, error: fetchError };
        }

        if (!currentStats) {
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
          console.error('Fehler beim Aktualisieren der Statistiken:', error);
        }

        return { data, error };
      } catch (error) {
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
      const newQuizzesCompleted = (currentStats.questions_answered || 0) + 1;
      
      // Update-Objekt erstellen
      const updateData: any = {
        total_xp: newTotalXp,
        questions_answered: newQuizzesCompleted
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
        .from('answered_questions')
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
  fetchLevels: async (): Promise<ApiResponse<DatabaseLevel[]>> => {
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
  fetchLeagues: async (): Promise<ApiResponse<DatabaseLeague[]>> => {
    return apiCall(async () => {
      const { data, error } = await supabase.from('leagues').select('*');

      return { data, error };
    });
  },

  /**
   * Ligapositionen eines Benutzers abrufen
   */
  fetchLeaguePositions: async (userId: string): Promise<ApiResponse<DatabaseLeaguePosition[]>> => {
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
  ): Promise<ApiResponse<DatabaseLeaguePosition>> => {
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
  fetchUniversities: async (): Promise<ApiResponse<DatabaseUniversity[]>> => {
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
        _user_id: userId
      });

      return { data, error };
    });
  },

  /**
   * Antwort einreichen und Belohnungen erhalten
   */
  submitAnswer: async (
    userId: string,
    questionId: number,
    isCorrect: boolean,
    streakBoostActive: boolean = false
  ): Promise<ApiResponse<SubmitAnswerResponse>> => {
    try {
      // @ts-ignore - Ignoriere die Typisierung für den RPC-Aufruf
      const { data, error } = await supabase.rpc('submit_answer', {
        p_user_id: userId,
        p_question_id: questionId,
        p_is_correct: isCorrect,
        p_streak_boost_active: streakBoostActive
      });

      if (error) {
        console.error('Fehler beim Einreichen der Antwort:', error);
        return { 
          data: null, 
          error: new Error(error.message),
          success: false 
        };
      }

      if (!data) {
        return {
          data: null,
          error: new Error('Keine Daten erhalten'),
          success: false
        };
      }

      // Sicherer doppelter Cast über unknown
      const response = (data as unknown) as SubmitAnswerResponse;

      return {
        data: response,
        error: null,
        success: true
      };
    } catch (error) {
      console.error('Fehler beim Einreichen der Antwort:', error);
      return { 
        data: null, 
        error: error instanceof Error ? error : new Error('Ein unerwarteter Fehler ist aufgetreten'),
        success: false 
      };
    }
  },
};

export default userService; 