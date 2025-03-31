// src/components/UniversityLeaderboard.tsx
import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

interface UniversityRow {
  university: string;
  xp_sum: number;
}

const UniversityLeaderboard: React.FC = () => {
  const [data, setData] = useState<UniversityRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      const { data: lbData, error } = await supabase.rpc(
        "get_university_leaderboard"
      );
      if (error) {
        console.error("Error fetching university leaderboard:", error);
      } else {
        setData(lbData as UniversityRow[]);
      }
      setLoading(false);
    };

    fetchLeaderboard();
  }, []);

  if (loading) return <div>Lade Universitäts-Leaderboard...</div>;

  return (
    <div>
      <h3>University-Leaderboard</h3>
      <table>
        <thead>
          <tr>
            <th>Platz</th>
            <th>Universität</th>
            <th>Punkte (XP)</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr key={row.university}>
              <td>{index + 1}</td>
              <td>{row.university}</td>
              <td>{row.xp_sum}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default UniversityLeaderboard;
