import type { Database as GeneratedDatabase } from '../lib/database.types';

export interface Database extends GeneratedDatabase {
  public: {
    Functions: GeneratedDatabase['public']['Functions'];
    Tables: GeneratedDatabase['public']['Tables'];
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
  get_user_progress: {
    question_id: number;
    is_answered: boolean;
    is_correct: boolean;
  }[];
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
  get_user_progress: {
    p_user_id: string;
    p_chapter_id: number;
  };
}

export interface RpcFunctionResult {
  submit_answer: {
    xp_awarded: number;
    coins_awarded: number;
    new_progress: number;
    streak: number;
  };
  get_user_progress: {
    question_id: number;
    is_answered: boolean;
    is_correct: boolean;
  }[];
}