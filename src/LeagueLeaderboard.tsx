// src/components/LeagueLeaderboard.tsx
import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Database } from "./types/supabase";
import logoSchwarz from "./assets/images/Bilder/logo-schwarz.svg";

type LeagueRow = {
  username: string;
  xp: number;
};

type League = Database['public']['Tables']['leagues']['Row'];

interface LeagueLeaderboardProps {
  leagueName: string; // z.B. "Holzliga"
}

const LeagueLeaderboard: React.FC<LeagueLeaderboardProps> = ({
  leagueName,
}) => {
  const [data, setData] = useState<LeagueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLeague, setSelectedLeague] = useState<string>(leagueName);
  const [availableLeagues, setAvailableLeagues] = useState<League[]>([]);
  const [leagueGroup, setLeagueGroup] = useState<string | null>(null);
  const [leagueLogo, setLeagueLogo] = useState<string | null>(null);

  // Lade die Ligagruppe des Benutzers
  useEffect(() => {
    const fetchLeagueGroup = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data: userStats } = await supabase
        .from('user_stats')
        .select('league_group')
        .eq('user_id', user.id)
        .single();
        
      if (userStats) {
        setLeagueGroup(userStats.league_group);
      }
    };

    fetchLeagueGroup();
  }, []);

  // Lade alle verfügbaren Ligen
  useEffect(() => {
    const fetchLeagues = async () => {
      const { data: leagues, error } = await supabase
        .from('leagues')
        .select('*');
        
      if (leagues) {
        setAvailableLeagues(leagues);
        
        // Finde das Logo für die aktuelle Liga
        const currentLeague = leagues.find(league => league.name === leagueName);
        if (currentLeague) {
          setLeagueLogo(currentLeague.league_img);
        }
      }
    };

    fetchLeagues();
  }, [leagueName]);

  // Lade die Leaderboard-Daten
  useEffect(() => {
    const fetchLeaderboard = async () => {
      const { data: lbData, error } = await supabase.rpc(
        "get_league_leaderboard",
        { league_name: selectedLeague }
      );
      if (error) {
        console.error("Error fetching league leaderboard:", error);
      } else {
        // Begrenze die Anzahl der Spieler auf maximal 30
        const limitedData = (lbData as LeagueRow[]).slice(0, 30);
        setData(limitedData);
      }
      setLoading(false);
    };

    fetchLeaderboard();
  }, [selectedLeague]);

  // Filtere Ligen nach Ligagruppe
  const filteredLeagues = leagueGroup 
    ? availableLeagues.filter(league => league.name.includes(leagueGroup))
    : availableLeagues;

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-400"></div>
    </div>
  );

  return (
    <div className="w-full">
      <div className="mb-6 p-6 bg-black text-white rounded-lg border border-yellow-400">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-yellow-400">
            Aktuelle Liga: <span className="font-bold text-white">{selectedLeague}</span>
          </h3>
          {leagueLogo && (
            <div className="w-16 h-16 overflow-hidden">
              <img 
                src={leagueLogo} 
                alt={`${selectedLeague} Logo`} 
                className="w-full h-full object-cover"
              />
            </div>
          )}
        </div>
      </div>
      
      {/* Liga-Auswahl */}
      {filteredLeagues.length > 1 && (
        <div className="league-selector">
          <h4 className="league-selector-title">
            Andere Ligen in deiner Gruppe:
          </h4>
          <div className="league-buttons">
            {filteredLeagues.map((league) => (
              <motion.button
                key={league.id}
                className={`league-button ${
                  selectedLeague === league.name ? "active" : ""
                }`}
                onClick={() => setSelectedLeague(league.name)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {league.league_img && (
                  <img 
                    src={league.league_img} 
                    alt={`${league.name} Logo`} 
                    className="league-logo"
                  />
                )}
                {league.name}
              </motion.button>
            ))}
          </div>
        </div>
      )}
      
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
            {data.map((row, index) => {
              // Bestimme die Klasse basierend auf der Position
              let rowClass = "";
              if (index < 5) {
                rowClass = "bg-green-50 dark:bg-green-900/20"; // Aufsteiger (erste 5)
              } else if (index >= data.length - 5) {
                rowClass = "bg-red-50 dark:bg-red-900/20"; // Absteiger (letzte 5)
              }
              
              return (
                <motion.tr 
                  key={row.username}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className={`hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${rowClass}`}
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
              );
            })}
          </tbody>
        </table>
      </div>
      
      {data.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          Keine Daten verfügbar
        </div>
      )}
    </div>
  );
};

export default LeagueLeaderboard;
