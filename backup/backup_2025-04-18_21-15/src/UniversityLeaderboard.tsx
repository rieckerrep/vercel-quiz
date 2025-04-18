// src/components/UniversityLeaderboard.tsx
import { useQuery } from "@tanstack/react-query";
import { supabase } from "./lib/supabaseClient";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface UniversityRow {
  university: string;
  xp_sum: number;
}

interface Contributor {
  username: string;
  total_xp: number;
  user_id: string;
}

const UniversityLeaderboard = () => {
  const [userUniversity, setUserUniversity] = useState<string | null>(null);
  const [selectedUniversity, setSelectedUniversity] = useState<string | null>(null);
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [isLoadingContributors, setIsLoadingContributors] = useState(false);

  useEffect(() => {
    const getUserUniversity = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        const { data, error } = await supabase
          .from('profiles')
          .select('university')
          .eq('id', session.user.id)
          .single();
        
        if (!error && data) {
          setUserUniversity(data.university);
        }
      }
    };

    getUserUniversity();
  }, []);

  const handleUniversityClick = async (university: string) => {
    setIsLoadingContributors(true);
    setSelectedUniversity(university);
    
    try {
      const { data, error } = await supabase.rpc('get_university_contributors', {
        uni_name: university
      });
      
      if (error) throw error;
      setContributors(data);
    } catch (error) {
      console.error('Fehler beim Laden der Beitragenden:', error);
    } finally {
      setIsLoadingContributors(false);
    }
  };

  const { data: leaderboardData, isLoading } = useQuery<UniversityRow[]>({
    queryKey: ['universityLeaderboard'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_university_leaderboard');
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
            Universitäts-Rangliste
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
                Universität
              </th>
              <th scope="col" className="text-white">
                Punkte
              </th>
            </tr>
          </thead>
          <tbody>
            {leaderboardData?.map((row, index) => (
              <motion.tr 
                key={row.university}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className={`hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer ${
                  userUniversity === row.university ? 'bg-yellow-100 dark:bg-yellow-900/30' : ''
                } ${selectedUniversity === row.university ? 'ring-2 ring-blue-500' : ''}`}
                onClick={() => handleUniversityClick(row.university)}
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
                  {row.university}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-black dark:text-white font-medium">
                  {row.xp_sum.toLocaleString()}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {selectedUniversity && (
        <div className="mt-8 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
          <h4 className="text-lg font-semibold mb-4 text-black dark:text-white">
            Beitragende von {selectedUniversity}
          </h4>
          {isLoadingContributors ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : contributors.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Spieler
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Beigetragene Punkte
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {contributors.map((contributor, index) => (
                    <motion.tr 
                      key={contributor.user_id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: index * 0.05 }}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {contributor.username || 'Unbekannt'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {contributor.total_xp.toLocaleString()}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-center">
              Keine Beitragenden gefunden
            </p>
          )}
        </div>
      )}
      
      {(!leaderboardData || leaderboardData.length === 0) && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          Keine Daten verfügbar
        </div>
      )}
    </div>
  );
};

export default UniversityLeaderboard;
