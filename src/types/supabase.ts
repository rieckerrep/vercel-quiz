import type { SupabaseDatabase } from './database.types';

export type Database = SupabaseDatabase;

export interface ApiResponse<T> {
  data: T | null;
  error: Error | null;
  success: boolean;
}

export interface SubmitAnswerResult {
  xp_awarded: number;
  coins_awarded: number;
  new_progress: number;
  streak: number;
}

type PublicSchema = Database['public'];

export type RpcFunction = 
  | 'get_league_leaderboard'
  | 'get_player_leaderboard'
  | 'get_subject_breakdown_for_user'
  | 'get_university_contributors'
  | 'get_university_leaderboard'
  | 'reset_leagues'
  | 'reset_uni_leaderboard'
  | 'update_league_groups'
  | 'submit_answer';

export type RpcFunctionReturnType = {
  get_league_leaderboard: { username: string; xp: number; }[];
  get_player_leaderboard: { username: string; xp: number; }[];
  get_subject_breakdown_for_user: { 
    subject_name: string;
    correct_count: number;
    wrong_count: number;
    total: number;
    correct_percent: number;
  }[];
  get_university_contributors: { 
    username: string;
    total_xp: number;
    user_id: string;
  }[];
  get_university_leaderboard: { 
    university: string;
    xp_sum: number;
  }[];
  reset_leagues: undefined;
  reset_uni_leaderboard: undefined;
  update_league_groups: undefined;
  submit_answer: SubmitAnswerResult[];
}

export type RpcReturnType<T extends RpcFunction> = RpcFunctionReturnType[T];

export type RpcArgs<T extends RpcFunction> = T extends 'submit_answer'
  ? { p_user_id: string; p_question_id: number; p_is_correct: boolean }
  : T extends 'get_league_leaderboard'
  ? { league_name: string }
  : Record<string, never>;