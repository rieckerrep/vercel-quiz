// src/components/PlayerLeaderboard.tsx
import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "./supabaseClient";

interface PlayerRow {
  username: string;
  xp: number;
}

const PlayerLeaderboard = () => {
  const { data: leaderboardData, isLoading } = useQuery<PlayerRow[]>({
    queryKey: ['playerLeaderboard'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_player_leaderboard');
      if (error) throw error;
      return data;
    }
  });

  if (isLoading) return <div>Lade Spieler-Leaderboard...</div>;

  return (
    <div>
      <h3>Spieler-Leaderboard</h3>
      <table>
        <thead>
          <tr>
            <th>Platz</th>
            <th>Spieler</th>
            <th>Gesamt-XP</th>
          </tr>
        </thead>
        <tbody>
          {leaderboardData?.map((row, index) => (
            <tr key={row.username}>
              <td>{index + 1}</td>
              <td>{row.username}</td>
              <td>{row.xp}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PlayerLeaderboard;
