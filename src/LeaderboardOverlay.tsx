// LeaderboardOverlay.tsx
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import LeagueLeaderboard from "./LeagueLeaderboard";
import UniversityLeaderboard from "./UniversityLeaderboard";
import PlayerLeaderboard from "./PlayerLeaderboard";
import "./LeaderboardOverlay.css"; // Das separate CSS für das Overlay
import { useQuery } from "@tanstack/react-query";
import { supabase } from "./lib/supabaseClient";
import { Database } from "./lib/supabase";
import React from 'react';
import logoSchwarz from "./assets/images/Bilder/logo-schwarz.svg";

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
    <motion.div
      className="leaderboard-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="leaderboard-content"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="leaderboard-header">
          <div className="flex items-center gap-4">
            <img 
              src={logoSchwarz} 
              alt="RieckerRep Logo" 
              className="h-12 w-auto"
            />
            <h2 className="leaderboard-title">Rangliste</h2>
          </div>
          <button
            onClick={onClose}
            className="close-button"
            aria-label="Schließen"
          >
            ×
          </button>
        </div>

        <div className="leaderboard-tabs">
          <motion.div
            className={`leaderboard-tab ${
              selectedLeaderboard === "league" ? "active" : ""
            }`}
            onClick={() => setSelectedLeaderboard("league")}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
          >
            Liga
          </motion.div>
          <motion.div
            className={`leaderboard-tab ${
              selectedLeaderboard === "university" ? "active" : ""
            }`}
            onClick={() => setSelectedLeaderboard("university")}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
          >
            Universität
          </motion.div>
          <motion.div
            className={`leaderboard-tab ${
              selectedLeaderboard === "player" ? "active" : ""
            }`}
            onClick={() => setSelectedLeaderboard("player")}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
          >
            Spieler
          </motion.div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={selectedLeaderboard}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            {content}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
