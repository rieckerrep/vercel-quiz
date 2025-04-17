export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string | null;
          avatar_url: string | null;
          created_at: string | null;
          current_league: string | null;
          university_id: string | null;
          bronze_medals: number | null;
          silver_medals: number | null;
          gold_medals: number | null;
          correct_answers: number | null;
          total_questions: number | null;
          total_xp: number | null;
          total_coins: number | null;
          level: number | null;
          streak: number | null;
          questions_answered: number | null;
        };
        Insert: {
          id: string;
          username?: string | null;
          avatar_url?: string | null;
          created_at?: string | null;
          current_league?: string | null;
          university_id?: string | null;
          bronze_medals?: number | null;
          silver_medals?: number | null;
          gold_medals?: number | null;
          correct_answers?: number | null;
          total_questions?: number | null;
          total_xp?: number | null;
          total_coins?: number | null;
          level?: number | null;
          streak?: number | null;
          questions_answered?: number | null;
        };
        Update: {
          id?: string;
          username?: string | null;
          avatar_url?: string | null;
          created_at?: string | null;
          current_league?: string | null;
          university_id?: string | null;
          bronze_medals?: number | null;
          silver_medals?: number | null;
          gold_medals?: number | null;
          correct_answers?: number | null;
          total_questions?: number | null;
          total_xp?: number | null;
          total_coins?: number | null;
          level?: number | null;
          streak?: number | null;
          questions_answered?: number | null;
        };
      };
      levels: {
        Row: {
          id: number;
          level: number;
          xp_required: number;
          title: string;
        };
        Insert: {
          level: number;
          xp_required: number;
          title: string;
        };
        Update: {
          level?: number;
          xp_required?: number;
          title?: string;
        };
      };
      leagues: {
        Row: {
          id: number;
          name: string;
          min_xp: number;
          max_xp: number;
          color: string;
        };
        Insert: {
          name: string;
          min_xp: number;
          max_xp: number;
          color: string;
        };
        Update: {
          name?: string;
          min_xp?: number;
          max_xp?: number;
          color?: string;
        };
      };
      league_positions: {
        Row: {
          id: number;
          user_id: string;
          league: string;
          position: number;
          xp: number;
          last_updated: string;
        };
        Insert: {
          user_id: string;
          league: string;
          position: number;
          xp: number;
          last_updated?: string;
        };
        Update: {
          user_id?: string;
          league?: string;
          position?: number;
          xp?: number;
          last_updated?: string;
        };
      };
      universities: {
        Row: {
          id: string;
          name: string;
          short_name: string;
          logo_url: string | null;
          total_score: number;
        };
        Insert: {
          id: string;
          name: string;
          short_name: string;
          logo_url?: string | null;
          total_score?: number;
        };
        Update: {
          id?: string;
          name?: string;
          short_name?: string;
          logo_url?: string | null;
          total_score?: number;
        };
      };
      user_stats: {
        Row: {
          id: number;
          user_id: string;
          total_xp: number;
          total_coins: number;
          level: number;
          streak: number;
          questions_answered: number;
          correct_answers: number;
          last_played: string | null;
        };
        Insert: {
          user_id: string;
          total_xp?: number;
          total_coins?: number;
          level?: number;
          streak?: number;
          questions_answered?: number;
          correct_answers?: number;
          last_played?: string | null;
        };
        Update: {
          user_id?: string;
          total_xp?: number;
          total_coins?: number;
          level?: number;
          streak?: number;
          questions_answered?: number;
          correct_answers?: number;
          last_played?: string | null;
        };
      };
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
    };
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
      };
      get_league_leaderboard: {
        Args: { league_name: string };
        Returns: { username: string; xp: number }[];
      };
      get_player_leaderboard: {
        Args: Record<string, never>;
        Returns: { username: string; xp: number }[];
      };
      get_subject_breakdown_for_user: {
        Args: { _user_id: string };
        Returns: {
          subject_name: string;
          correct_count: number;
          wrong_count: number;
          total: number;
          correct_percent: number;
        }[];
      };
      get_university_contributors: {
        Args: { university_id: string };
        Returns: { username: string; contribution: number }[];
      };
      get_university_leaderboard: {
        Args: Record<string, never>;
        Returns: { university_name: string; total_score: number }[];
      };
      reset_leagues: {
        Args: Record<string, never>;
        Returns: void;
      };
      reset_uni_leaderboard: {
        Args: Record<string, never>;
        Returns: void;
      };
      update_league_groups: {
        Args: Record<string, never>;
        Returns: void;
      };
      calculate_and_award_xp: {
        Args: {
          p_user_id: string;
          p_correct_question_ids: number[];
          p_correct_subquestion_ids: number[];
        };
        Returns: number;
      };
      update_level_on_xp_change: {
        Args: { p_user_id: string };
        Returns: { old_level: number; new_level: number; level_up: boolean };
      };
    };
  };
}

export type SubmitAnswerResult = Database['public']['Functions']['submit_answer']['Returns'];
export type AnsweredQuestionsInsert = Database['public']['Tables']['answered_questions']['Insert'];
export type Tables = Database['public']['Tables'];
export type Functions = Database['public']['Functions'];
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type UserStats = Database['public']['Tables']['user_stats']['Row'];
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']; 