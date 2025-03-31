// src/components/LeagueLeaderboard.tsx
import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

interface LeagueRow {
  username: string;
  xp: number;
}

interface LeagueLeaderboardProps {
  leagueName: string; // z.B. "Holzliga"
}

const LeagueLeaderboard: React.FC<LeagueLeaderboardProps> = ({
  leagueName,
}) => {
  const [data, setData] = useState<LeagueRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      const { data: lbData, error } = await supabase.rpc(
        "get_league_leaderboard",
        { league_name: leagueName }
      );
      if (error) {
        console.error("Error fetching league leaderboard:", error);
      } else {
        setData(lbData as LeagueRow[]);
      }
      setLoading(false);
    };

    fetchLeaderboard();
  }, [leagueName]);

  if (loading) return <div>Lade Liga-Leaderboard...</div>;

  return (
    <div>
      <h3>Aktuelle Liga: {leagueName}</h3>
      <table>
        <thead>
          <tr>
            <th>Platz</th>
            <th>Spieler</th>
            <th>Punkte</th>
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

export default LeagueLeaderboard;
