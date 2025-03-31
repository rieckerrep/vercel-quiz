// LeaderboardOverlay.tsx
import React, { useState } from "react";
import { motion } from "framer-motion";
import LeagueLeaderboard from "./LeagueLeaderboard";
import UniversityLeaderboard from "./UniversityLeaderboard";
import PlayerLeaderboard from "./PlayerLeaderboard";
import "./LeaderboardOverlay.css"; // Das separate CSS für das Overlay

interface LeaderboardOverlayProps {
  currentUserId: string;
  leagueName: string;
  onClose: () => void;
}

export default function LeaderboardOverlay({
  currentUserId,
  onClose,
}: LeaderboardOverlayProps) {
  // State für die aktuell ausgewählte Leaderboard-Kategorie
  const [selectedLeaderboard, setSelectedLeaderboard] = useState<
    "league" | "university" | "player"
  >("league");

  let content;
  if (selectedLeaderboard === "league") {
    // Hier den gewünschten Liga-Namen übergeben, z.B. "Bronzeliga"
    content = (
      <LeagueLeaderboard
        currentUserId={currentUserId}
        leagueName="Bronzeliga"
      />
    );
  } else if (selectedLeaderboard === "university") {
    content = <UniversityLeaderboard currentUserId={currentUserId} />;
  } else if (selectedLeaderboard === "player") {
    content = <PlayerLeaderboard currentUserId={currentUserId} />;
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
