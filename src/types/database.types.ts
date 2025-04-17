export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface SupabaseDatabase {
  public: {
    Tables: {
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          university: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          university?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          university?: string | null
          username?: string | null
        }
      }
      user_stats: {
        Row: {
          avatar_url: string | null
          bronze_medals: number | null
          correct_answers: number | null
          created_at: string | null
          current_league: string | null
          gold_medals: number | null
          id: string
          last_played: string | null
          league_group: string | null
          level: number | null
          questions_answered: number | null
          silver_medals: number | null
          streak: number | null
          title: string | null
          total_coins: number | null
          total_xp: number | null
          updated_at: string | null
          user_id: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bronze_medals?: number | null
          correct_answers?: number | null
          created_at?: string | null
          current_league?: string | null
          gold_medals?: number | null
          id?: string
          last_played?: string | null
          league_group?: string | null
          level?: number | null
          questions_answered?: number | null
          silver_medals?: number | null
          streak?: number | null
          title?: string | null
          total_coins?: number | null
          total_xp?: number | null
          updated_at?: string | null
          user_id?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bronze_medals?: number | null
          correct_answers?: number | null
          created_at?: string | null
          current_league?: string | null
          gold_medals?: number | null
          id?: string
          last_played?: string | null
          league_group?: string | null
          level?: number | null
          questions_answered?: number | null
          silver_medals?: number | null
          streak?: number | null
          title?: string | null
          total_coins?: number | null
          total_xp?: number | null
          updated_at?: string | null
          user_id?: string
          username?: string | null
        }
      }
      levels: {
        Row: {
          id: number
          level_image: string | null
          level_number: number
          level_title: string | null
          xp_required: number
        }
        Insert: {
          id?: number
          level_image?: string | null
          level_number: number
          level_title?: string | null
          xp_required: number
        }
        Update: {
          id?: number
          level_image?: string | null
          level_number?: number
          level_title?: string | null
          xp_required?: number
        }
      }
      leagues: {
        Row: {
          id: number
          league_img: string | null
          name: string
        }
        Insert: {
          id?: number
          league_img?: string | null
          name: string
        }
        Update: {
          id?: number
          league_img?: string | null
          name?: string
        }
      }
      league_positions: {
        Row: {
          league_name: string
          points: number | null
          ranking: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          league_name: string
          points?: number | null
          ranking?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          league_name?: string
          points?: number | null
          ranking?: number | null
          updated_at?: string | null
          user_id?: string
        }
      }
      universities: {
        Row: {
          created_at: string | null
          id: number
          name: string
          xp_total: number | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          name: string
          xp_total?: number | null
        }
        Update: {
          created_at?: string | null
          id?: number
          name?: string
          xp_total?: number | null
        }
      }
      answered_questions: {
        Row: {
          id: number;
          user_id: string;
          question_id: number;
          is_correct: boolean;
          answered_at: string;
          chapter_id: number;
          selected_option?: string;
        };
        Insert: {
          user_id: string;
          question_id: number;
          is_correct: boolean;
          answered_at?: string;
          chapter_id: number;
          selected_option?: string;
        };
        Update: {
          user_id?: string;
          question_id?: number;
          is_correct?: boolean;
          answered_at?: string;
          chapter_id?: number;
          selected_option?: string;
        };
      };
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      submit_answer: {
        Args: {
          p_user_id: string;
          p_question_id: number;
          p_is_correct: boolean;
          p_streak_boost_active?: boolean;
        };
        Returns: {
          xp_awarded: number;
          coins_awarded: number;
          new_progress: number;
          streak: number;
        };
      }
      get_league_leaderboard: {
        Args: { league_name: string }
        Returns: { username: string; xp: number; }[]
      }
      get_player_leaderboard: {
        Args: Record<PropertyKey, never>
        Returns: { username: string; xp: number; }[]
      }
      get_subject_breakdown_for_user: {
        Args: { _user_id: string }
        Returns: {
          subject_name: string;
          correct_count: number;
          wrong_count: number;
          total: number;
          correct_percent: number;
        }[]
      }
      get_university_contributors: {
        Args: { uni_name: string }
        Returns: {
          username: string;
          total_xp: number;
          user_id: string;
        }[]
      }
      get_university_leaderboard: {
        Args: Record<PropertyKey, never>
        Returns: { university: string; xp_sum: number; }[]
      }
      reset_leagues: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      reset_uni_leaderboard: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      update_league_groups: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      calculate_and_award_xp: {
        Args: {
          question_ids: number[]
          subquestion_ids: number[]
          user_id_param: string
        }
        Returns: number
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type SubmitAnswerResult = SupabaseDatabase['public']['Functions']['submit_answer']['Returns'];
export type AnsweredQuestionsInsert = SupabaseDatabase['public']['Tables']['answered_questions']['Insert'];
export type Tables = SupabaseDatabase['public']['Tables'];
export type Functions = SupabaseDatabase['public']['Functions']; 