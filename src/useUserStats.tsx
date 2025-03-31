// useUserStats.ts
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "./supabaseClient";
import { Database } from "./types/supabase";

type UserStats = Database['public']['Tables']['user_stats']['Row'];

// Lädt die Statistiken eines Users
async function fetchUserStats(userId: string): Promise<UserStats | null> {
  const { data, error } = await supabase
    .from("user_stats")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

// Aktualisiert die Statistiken in der DB
async function updateUserStatsDB(
  userId: string,
  updates: Partial<UserStats>
): Promise<void> {
  const { error } = await supabase
    .from("user_stats")
    .update(updates)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
}

export function useUserStats(userId: string) {
  const queryClient = useQueryClient();
  const { data, isLoading, error, refetch } = useQuery<UserStats | null, Error>({
    queryKey: ["userStats", userId],
    queryFn: () => fetchUserStats(userId),
    staleTime: 60000,
    enabled: !!userId,
  });

  const updateUserStats = async (updates: Partial<UserStats>) => {
    await updateUserStatsDB(userId, updates);
    await queryClient.invalidateQueries({ queryKey: ["userStats", userId] });
  };

  return {
    userStats: data,
    isLoading,
    error,
    refetch,
    updateUserStats
  };
}
