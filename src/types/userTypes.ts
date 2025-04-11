export interface UserProfile {
  id: string;
  email: string;
  username: string;
  avatar_url?: string;
  created_at: string;
  last_login: string;
}

export interface UserStats {
  total_xp: number;
  total_coins: number;
  level: number;
  correct_answers: number;
  wrong_answers: number;
  streak: number;
  max_streak: number;
}

// Zusätzliche Typen für die Benutzeroberfläche
export interface UserState {
  profile: UserProfile | null;
  stats: UserStats | null;
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