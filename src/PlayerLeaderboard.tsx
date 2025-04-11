// src/components/PlayerLeaderboard.tsx
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "./lib/supabaseClient";
import { motion } from "framer-motion";

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

  if (isLoading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );

  return (
    <div className="w-full">
      <div className="mb-6 p-6 bg-black text-white rounded-lg border border-yellow-400">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-white">
            Spieler-Rangliste
          </h3>
        </div>
      </div>
      
      <div className="overflow-x-auto rounded-lg shadow-md">
        <table className="leaderboard-table">
          <thead>
            <tr>
              <th scope="col" className="text-white">
                Platz
              </th>
              <th scope="col" className="text-white">
                Spieler
              </th>
              <th scope="col" className="text-white">
                Punkte
              </th>
            </tr>
          </thead>
          <tbody>
            {leaderboardData?.map((row, index) => (
              <motion.tr 
                key={row.username}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className={`hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors`}
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-black dark:text-white">
                  {index === 0 ? (
                    <span className="flex items-center">
                      <span className="text-yellow-400 mr-2">🥇</span>
                      {index + 1}
                    </span>
                  ) : index === 1 ? (
                    <span className="flex items-center">
                      <span className="text-gray-400 mr-2">🥈</span>
                      {index + 1}
                    </span>
                  ) : index === 2 ? (
                    <span className="flex items-center">
                      <span className="text-amber-600 mr-2">🥉</span>
                      {index + 1}
                    </span>
                  ) : (
                    index + 1
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-black dark:text-white">
                  {row.username}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-black dark:text-white font-medium">
                  {row.xp.toLocaleString()}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {(!leaderboardData || leaderboardData.length === 0) && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          Keine Daten verfügbar
        </div>
      )}
    </div>
  );
};

export default PlayerLeaderboard;
