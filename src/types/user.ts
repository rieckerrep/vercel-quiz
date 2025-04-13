import { Database } from '../lib/supabase';

export type UserProfile = {
  id: string;
  username: string | null;
  avatar_url: string | null;
  university: string | null;
  created_at: string;
};

export type UserStats = {
  id: string;
  user_id: string;
  correct_answers: number | null;
  total_coins: number | null;
  current_league: string | null;
  gold_medals: number | null;
  silver_medals: number | null;
  bronze_medals: number | null;
  created_at: string | null;
};

// Eigene Typdefinitionen für Achievements, Settings und Sessions
export type UserAchievement = {
  id: string;
  user_id: string;
  achievement_id: string;
  achieved_at: string;
  description: string | null;
};

export type UserSettings = {
  id: string;
  user_id: string;
  notifications_enabled: boolean;
  sound_enabled: boolean;
  theme: string | null;
  language: string | null;
  updated_at: string | null;
};

export type UserSession = {
  id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  duration: number | null;
  questions_answered: number | null;
  correct_answers: number | null;
};

// Zusätzliche Typen für die Benutzeroberfläche
export interface UserState {
  profile: UserProfile | null;
  stats: UserStats | null;
  settings: UserSettings | null;
  isLoading: boolean;
  error: string | null;
}

// Typen für API-Antworten
export interface ApiResponse<T> {
  data: T | null;
  error: Error | null;
}

export interface StatsResponse {
  data: UserStats | null;
  error: Error | null;
}

export interface SettingsResponse {
  data: UserSettings | null;
  error: Error | null;
} 