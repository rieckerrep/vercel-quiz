import { Database } from './supabase';

export interface Profile {
  id: string;
  username: string | null;
  avatar_url: string | null;
  level: number;
  xp: number;
  coins: number;
  created_at: string;
  updated_at: string;
  university: string | null;
}

export interface UserStats {
  gold: number;
  silver: number;
  bronze: number;
  total_xp: number;
  level: number;
  current_league: string;
  total_coins: number;
} 