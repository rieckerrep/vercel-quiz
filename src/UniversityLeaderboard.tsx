// src/components/UniversityLeaderboard.tsx
import { useQuery } from "@tanstack/react-query";
import { supabase } from "./supabaseClient";

interface UniversityRow {
  university: string;
  xp_sum: number;
}

const UniversityLeaderboard = () => {
  const { data: leaderboardData, isLoading } = useQuery<UniversityRow[]>({
    queryKey: ['universityLeaderboard'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_university_leaderboard');
      if (error) throw error;
      return data;
    }
  });

  if (isLoading) return <div>Lade Universitäts-Leaderboard...</div>;

  return (
    <div>
      <h3>University-Leaderboard</h3>
      <table>
        <thead>
          <tr>
            <th>Platz</th>
            <th>Universität</th>
            <th>Gesamt-XP</th>
          </tr>
        </thead>
        <tbody>
          {leaderboardData?.map((row, index) => (
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
