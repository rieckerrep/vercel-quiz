// LeaderboardOverlay.tsx
import { useState } from "react";
import { motion } from "framer-motion";
import LeagueLeaderboard from "./LeagueLeaderboard";
import UniversityLeaderboard from "./UniversityLeaderboard";
import PlayerLeaderboard from "./PlayerLeaderboard";
import "./LeaderboardOverlay.css"; // Das separate CSS für das Overlay
import { useQuery } from "@tanstack/react-query";
import { supabase } from "./supabaseClient";
import { Database } from "./types/supabase";

type UserStats = Database['public']['Tables']['user_stats']['Row'];

interface LeaderboardOverlayProps {
  onClose: () => void;
}

export default function LeaderboardOverlay({
  onClose,
}: LeaderboardOverlayProps) {
  // State für die aktuell ausgewählte Leaderboard-Kategorie
  const [selectedLeaderboard, setSelectedLeaderboard] = useState<
    "league" | "university" | "player"
  >("league");

  // Lade die Benutzerdaten aus der Datenbank
  const { data: userStats } = useQuery({
    queryKey: ['userStats'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Nicht eingeloggt');
      
      const { data, error } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', user.id)
        .single();
        
      if (error) throw error;
      return data as UserStats;
    }
  });

  let content;
  if (selectedLeaderboard === "league") {
    content = (
      <LeagueLeaderboard
        leagueName={userStats?.current_league || "Bronzeliga"}
      />
    );
  } else if (selectedLeaderboard === "university") {
    content = <UniversityLeaderboard />;
  } else if (selectedLeaderboard === "player") {
    content = <PlayerLeaderboard />;
  }

  return (
    <div className="leaderboard-overlay">
      <div className="leaderboard-container">
        <div className="leaderboard-sidebar">
          <h3>Leaderboards</h3>
          <ul>
            <li
              className={selectedLeaderboard === "league" ? "active" : ""}
              onClick={() => setSelectedLeaderboard("league")}
            >
              Liga
            </li>
            <li
              className={selectedLeaderboard === "university" ? "active" : ""}
              onClick={() => setSelectedLeaderboard("university")}
            >
              Universität
            </li>
            <li
              className={selectedLeaderboard === "player" ? "active" : ""}
              onClick={() => setSelectedLeaderboard("player")}
            >
              Spieler
            </li>
          </ul>
        </div>
        <div className="leaderboard-main">
          <button className="leaderboard-close" onClick={onClose}>
            ×
          </button>
          <h2>
            {selectedLeaderboard === "league"
              ? "Liga-Leaderboard"
              : selectedLeaderboard === "university"
              ? "Universitäts-Leaderboard"
              : "Spieler-Leaderboard"}
          </h2>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            {content}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
