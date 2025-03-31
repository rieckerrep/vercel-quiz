// useUserStats.ts
import { useQuery } from "@tanstack/react-query";
import { supabase } from "./supabaseClient";

interface UserStats {
  gold: number;
  silver: number;
  bronze: number;
  total_xp: number;
  level: number;
  current_league: string;
  total_coins: number;
}

// Lädt die Statistiken eines Users
async function fetchUserStats(userId: string): Promise<UserStats | null> {
  const { data, error } = await supabase
    .from("user_stats")
    .select(
      "gold_medals, silver_medals, bronze_medals, total_xp, level, current_league, total_coins"
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);

  if (data) {
    return {
      gold: data.gold_medals || 0,
      silver: data.silver_medals || 0,
      bronze: data.bronze_medals || 0,
      total_xp: data.total_xp || 0,
      level: data.level || 1,
      current_league: data.current_league || "Holzliga",
      total_coins: data.total_coins || 0,
    };
  }

  return null;
}

// Aktualisiert die Statistiken in der DB
async function updateUserStatsDB(
  userId: string,
  updates: Partial<UserStats>
): Promise<UserStats | null> {
  const { error } = await supabase
    .from("user_stats")
    .update(updates)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);

  return fetchUserStats(userId);
}

export function useUserStats(userId: string) {
  const { data, isLoading, error, refetch } = useQuery<UserStats | null, Error>(
    {
      queryKey: ["userStats", userId],
      queryFn: () => fetchUserStats(userId),
      staleTime: 60000,
      enabled: !!userId,
    }
  );

  return {
    userStats: data,
    isLoading,
    error,
    refetch,
  };
}
