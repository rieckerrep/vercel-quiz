import type { Database as GeneratedDatabase } from '../lib/database.types';

export interface Database extends GeneratedDatabase {
  public: {
    Functions: {
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
    };
    Tables: GeneratedDatabase['public']['Tables'] & {
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
  };
}

export type SubmitAnswerResult = Database['public']['Functions']['submit_answer']['Returns'];
export type SubmitAnswerArgs = Database['public']['Functions']['submit_answer']['Args'];
export type AnsweredQuestionsInsert = Database['public']['Tables']['answered_questions']['Insert'];
export type Tables = Database['public']['Tables'];
export type Functions = Database['public']['Functions'];

export type UserStats = Database['public']['Tables']['user_stats']['Row'];

export interface ApiResponse<T> {
  data: T | null;
  error: Error | null;
  success: boolean;
}

type PublicSchema = Database['public'];

export type RpcFunctionReturnType = {
  get_league_leaderboard: { username: string; xp: number }[];
  get_player_leaderboard: { username: string; xp: number }[];
  get_subject_breakdown_for_user: {
    subject_name: string;
    correct_count: number;
    wrong_count: number;
    total: number;
    correct_percent: number;
  }[];
  get_university_contributors: { username: string; contribution: number }[];
  get_university_leaderboard: { university_name: string; total_score: number }[];
  reset_leagues: void;
  reset_uni_leaderboard: void;
  update_league_groups: void;
  calculate_and_award_xp: number;
  update_level_on_xp_change: { old_level: number; new_level: number; level_up: boolean };
  submit_answer: {
    xp_awarded: number;
    coins_awarded: number;
    new_progress: number;
    streak: number;
  };
}

export type RpcReturnType<T extends keyof RpcFunctionReturnType> = RpcFunctionReturnType[T];

export type RpcFunction = keyof Database['public']['Functions'];
export type RpcArgs<T extends RpcFunction> = Database['public']['Functions'][T]['Args'];
export type RpcReturns<T extends RpcFunction> = Database['public']['Functions'][T]['Returns'];

export interface RpcFunctionParams {
  get_league_leaderboard: { league_name: string };
  get_player_leaderboard: {};
  get_subject_breakdown_for_user: { _user_id: string };
  get_university_contributors: { university_id: string };
  get_university_leaderboard: {};
  reset_leagues: {};
  reset_uni_leaderboard: {};
  update_league_groups: {};
  calculate_and_award_xp: {
    p_user_id: string;
    p_correct_question_ids: number[];
    p_correct_subquestion_ids: number[];
  };
  submit_answer: {
    p_user_id: string;
    p_question_id: string;
    p_is_correct: boolean;
    p_streak_boost_active?: boolean;
  };
}

export interface RpcFunctionResult {
  submit_answer: {
    xp_awarded: number;
    coins_awarded: number;
    new_progress: number;
    streak: number;
  };
}