// src/components/PlayerLeaderboard.tsx
import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

interface PlayerRow {
  username: string;
  xp: number;
}

const PlayerLeaderboard: React.FC = () => {
  const [data, setData] = useState<PlayerRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      const { data: lbData, error } = await supabase.rpc(
        "get_player_leaderboard"
      );
      if (error) {
        console.error("Error fetching player leaderboard:", error);
      } else {
        setData(lbData as PlayerRow[]);
      }
      setLoading(false);
    };

    fetchLeaderboard();
  }, []);

  if (loading) return <div>Lade Spieler-Leaderboard...</div>;

  return (
    <div>
      <h3>Spieler-Leaderboard</h3>
      <table>
        <thead>
          <tr>
            <th>Platz</th>
            <th>Spieler</th>
            <th>XP</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
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
