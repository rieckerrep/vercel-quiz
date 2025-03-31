import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { motion, AnimatePresence } from "framer-motion";
import { goldMedal, silverMedal, bronzeMedal, scaleIcon } from "./assets/images";
import "./EndScreen.css";

export interface EndScreenProps {
  user: any;
  roundXp: number;
  possibleRoundXp?: number;
  roundCoins: number;
  medalType: string;
  onRestart: () => void;
}

interface Profile {
  username: string;
  university: string;
  avatar_url: string;
}

interface UserStats {
  gold: number;
  silver: number;
  bronze: number;
  total_xp: number;
  level: number;
  current_league: string;
}

interface LevelData {
  id: number;
  name: string;
  xp_required: number;
  level_image: string;
}

interface LeagueData {
  id: number;
  name: string;
  league_img: string;
}

export default function EndScreen({
  user,
  roundXp,
  possibleRoundXp = 0,
  roundCoins,
  medalType,
  onRestart,
}: EndScreenProps) {
  // Halbkreis-Animation (rechte Seite)
  const [circleDash, setCircleDash] = useState(0);
  const halfCircleCircumference = 50.265;

  // Profil + Stats laden (für Levelnamen, etc.)
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [levelData, setLevelData] = useState<LevelData | null>(null);
  const [leagueData, setLeagueData] = useState<LeagueData | null>(null);

  // Animierte Medaillen-Zähler
  const [animatedMedalCounts, setAnimatedMedalCounts] = useState<{
    gold: number;
    silver: number;
    bronze: number;
  }>({ gold: 0, silver: 0, bronze: 0 });

  // Kreis-Fortschritt für nächstes Level
  const [levelCircleDash, setLevelCircleDash] = useState(0);
  const circleCircumference = 100;
  const [nextLevelXP, setNextLevelXP] = useState<number | null>(null);

  // Animation für den Fortschrittsbalken
  useEffect(() => {
    const ratio = possibleRoundXp > 0 ? roundXp / possibleRoundXp : 0;
    const finalProgress = ratio * halfCircleCircumference;
    
    let current = 0;
    const steps = 50;
    const stepValue = finalProgress / steps;
    let stepCount = 0;

    const timer = setInterval(() => {
      stepCount++;
      current += stepValue;
      if (stepCount >= steps) {
        current = finalProgress;
        clearInterval(timer);
      }
      setCircleDash(current);
    }, 20);

    return () => clearInterval(timer);
  }, [roundXp, possibleRoundXp]);

  // 1) Profil + Stats laden
  useEffect(() => {
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) return;
      const user = session.user;

      // Profil laden
      const { data: profileData } = await supabase
        .from("profiles")
        .select("username, university, avatar_url")
        .eq("id", user.id)
        .maybeSingle();
      setProfile(profileData || null);

      // User-Stats laden
      const { data: statsData } = await supabase
        .from("user_stats")
        .select(
          "gold_medals, silver_medals, bronze_medals, total_xp, level, current_league"
        )
        .eq("user_id", user.id)
        .maybeSingle();
      setStats({
        gold: statsData?.gold_medals || 0,
        silver: statsData?.silver_medals || 0,
        bronze: statsData?.bronze_medals || 0,
        total_xp: statsData?.total_xp || 0,
        level: statsData?.level || 1,
        current_league: statsData?.current_league || "Holzliga",
      });
    })();
  }, []);

  // 2) Level + Liga laden
  useEffect(() => {
    if (!stats) return;
    (async () => {
      // Level laden
      const { data: levelRows } = await supabase
        .from("levels")
        .select("*")
        .eq("id", stats.level)
        .maybeSingle();
      if (levelRows) {
        setLevelData(levelRows);
      }
      // Liga laden
      const { data: leagueRows } = await supabase
        .from("leagues")
        .select("*")
        .eq("name", stats.current_league)
        .maybeSingle();
      if (leagueRows) {
        setLeagueData(leagueRows);
      }
    })();
  }, [stats]);

  // 3) Medaillen-Zähler initialisieren
  useEffect(() => {
    if (stats) {
      setAnimatedMedalCounts({
        gold: stats.gold,
        silver: stats.silver,
        bronze: stats.bronze,
      });
    }
  }, [stats]);

  // Animation bei Medaillen-Zähler
  useEffect(() => {
    if (!stats) return;
    if (["Gold", "Silber", "Bronze"].includes(medalType)) {
      const duration = 1000;
      const steps = 20;
      const intervalTime = duration / steps;
      let step = 0;
      const startCounts = { ...animatedMedalCounts };
      const targetCounts = { ...animatedMedalCounts };

      if (medalType === "Gold") {
        targetCounts.gold = animatedMedalCounts.gold + 1;
      } else if (medalType === "Silber") {
        targetCounts.silver = animatedMedalCounts.silver + 1;
      } else if (medalType === "Bronze") {
        targetCounts.bronze = animatedMedalCounts.bronze + 1;
      }

      const diff = {
        gold: targetCounts.gold - startCounts.gold,
        silver: targetCounts.silver - startCounts.silver,
        bronze: targetCounts.bronze - startCounts.bronze,
      };

      const timer = setInterval(() => {
        step++;
        setAnimatedMedalCounts({
          gold: Math.round(startCounts.gold + (diff.gold * step) / steps),
          silver: Math.round(startCounts.silver + (diff.silver * step) / steps),
          bronze: Math.round(startCounts.bronze + (diff.bronze * step) / steps),
        });
        if (step >= steps) clearInterval(timer);
      }, intervalTime);

      return () => clearInterval(timer);
    }
  }, [medalType, stats, animatedMedalCounts]);

  // 4) Kreis-Fortschritt (nächstes Level)
  useEffect(() => {
    (async () => {
      if (!levelData || !stats) return;
      const nextLevelId = levelData.id + 1;
      const { data: nextLevel } = await supabase
        .from("levels")
        .select("xp_required")
        .eq("id", nextLevelId)
        .maybeSingle();
      const xpRequiredNext =
        nextLevel?.xp_required ?? levelData.xp_required + 100;
      setNextLevelXP(xpRequiredNext);

      const xpNow = stats.total_xp;
      const xpCurrentLevel = levelData.xp_required;
      const xpNeededThisLevel = xpNow - xpCurrentLevel;
      const xpNeededForNext = xpRequiredNext - xpCurrentLevel;
      const ratio =
        xpNeededForNext > 0 ? xpNeededThisLevel / xpNeededForNext : 1;
      const finalDash = ratio * circleCircumference;
      let current = 0;
      const steps = 60;
      const stepValue = finalDash / steps;
      let stepCount = 0;
      const timer = setInterval(() => {
        stepCount++;
        current += stepValue;
        if (stepCount >= steps) {
          current = finalDash;
          clearInterval(timer);
        }
        setLevelCircleDash(current);
      }, 20);
      return () => clearInterval(timer);
    })();
  }, [levelData, stats]);

  if (!profile || !stats) {
    return (
      <div className="quiz-container min-h-[600px] bg-[#151923] rounded-lg shadow-lg flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center"
        >
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            className="w-16 h-16 border-4 border-yellow-400 border-t-transparent rounded-full mb-4"
          />
          <p className="text-white text-xl">Ergebnisse werden geladen...</p>
        </motion.div>
      </div>
    );
  }

  const questionsCorrect = Math.floor(roundXp / 10);
  const levelName = levelData?.name || "Unbekannter Level";
  const xpNow = stats.total_xp;
  const xpNext = nextLevelXP ?? (levelData?.xp_required ?? 0) + 100;

  // Medaillen-URLs
  let medalImg = "";
  if (medalType === "Gold") medalImg = goldMedal;
  else if (medalType === "Silber") medalImg = silverMedal;
  else if (medalType === "Bronze") medalImg = bronzeMedal;

  const roundPercent = possibleRoundXp > 0
    ? Math.round((roundXp / possibleRoundXp) * 100)
    : 0;

  return (
    <motion.div 
      className="quiz-container min-h-[600px] max-h-[600px] bg-[#151923] rounded-lg shadow-lg overflow-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex flex-col md:flex-row h-full">
        {/* Linke Spalte (dunkler Hintergrund) */}
        <motion.div 
          className="w-full md:w-1/2 bg-[#10131c] text-white p-6 flex flex-col"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex justify-between items-center mb-4">
            <motion.h2 
              className="text-2xl font-bold"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              {profile.username}
            </motion.h2>
            
            {leagueData?.league_img && (
              <motion.img
                src={leagueData.league_img}
                alt="Liga"
                className="w-12 h-12 object-contain"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", delay: 0.4 }}
              />
            )}
          </div>
          
          <p className="text-gray-400 text-sm mb-6">{profile.university}</p>
          
          {/* Avatar und Level-Icon */}
          <div className="flex flex-wrap justify-center items-center gap-6 mb-8">
            <motion.div 
              className="w-32 h-32 rounded-full overflow-hidden border-2 border-yellow-400"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.5 }}
            >
              <img
                src={profile.avatar_url}
                alt="Avatar"
                className="w-full h-full object-cover"
              />
            </motion.div>
            
            {levelData?.level_image && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <img
                  src={levelData.level_image}
                  alt="Level Icon"
                  className="w-16 h-16 object-contain"
                />
              </motion.div>
            )}
          </div>
          
          {/* Level-Progress-Kreis */}
          <div className="relative w-40 h-40 mx-auto mb-6">
            <svg viewBox="0 0 36 36" className="w-full h-full">
              <path
                d="M18 2.0845
                   a 15.9155 15.9155 0 0 1 0 31.831
                   a 15.9155 15.9155 0 0 1 0 -31.831"
                stroke="#444"
                strokeWidth={2.5}
                fill="none"
              />
              <motion.path
                stroke="#FFD700"
                strokeWidth={2.5}
                strokeLinecap="round"
                fill="none"
                initial={{ strokeDasharray: "0, 100" }}
                animate={{ strokeDasharray: `${levelCircleDash}, ${circleCircumference}` }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                d="M18 2.0845
                   a 15.9155 15.9155 0 0 1 0 31.831
                   a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
              <div className="text-lg font-bold">Lvl {levelData?.id ?? 1}</div>
              <div className="text-xs">{xpNow} / {xpNext}</div>
            </div>
          </div>
          
          {/* Medaillen-Anzeige */}
          <motion.div 
            className="flex justify-center gap-8 mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            <div className="flex flex-col items-center">
              <img src={goldMedal} alt="Gold" className="w-8 h-8 mb-1" />
              <motion.span 
                className="text-yellow-400 font-bold"
                key={animatedMedalCounts.gold}
                initial={{ scale: 0.5 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring" }}
              >
                {animatedMedalCounts.gold}
              </motion.span>
            </div>
            
            <div className="flex flex-col items-center">
              <img src={silverMedal} alt="Silber" className="w-8 h-8 mb-1" />
              <motion.span 
                className="text-gray-300 font-bold"
                key={animatedMedalCounts.silver}
                initial={{ scale: 0.5 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring" }}
              >
                {animatedMedalCounts.silver}
              </motion.span>
            </div>
            
            <div className="flex flex-col items-center">
              <img src={bronzeMedal} alt="Bronze" className="w-8 h-8 mb-1" />
              <motion.span 
                className="text-amber-700 font-bold"
                key={animatedMedalCounts.bronze}
                initial={{ scale: 0.5 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring" }}
              >
                {animatedMedalCounts.bronze}
              </motion.span>
            </div>
          </motion.div>
          
          <div className="mt-auto text-center">
            <p className="text-white">{levelName}</p>
          </div>
        </motion.div>

        {/* Rechte Spalte (hellerer Hintergrund) */}
        <motion.div 
          className="w-full md:w-1/2 bg-[#202431] p-6 flex flex-col items-center"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.4 }}
          >
            <img
              src={scaleIcon}
              alt="Waage"
              className="w-20 h-20 mb-6"
            />
          </motion.div>
          
          <motion.div
            className="text-center mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <h3 className="text-xl text-white mb-2">Rundenübersicht</h3>
            <p className="text-gray-300">
              Du hast {questionsCorrect}{" "}
              {questionsCorrect === 1 ? "Frage" : "Fragen"} richtig beantwortet!
            </p>
          </motion.div>
          
          {/* Halbkreis-Fortschritt */}
          <div className="w-full max-w-[250px] mb-6">
            <div className="relative h-[125px]">
              <svg viewBox="0 0 36 36" className="w-full">
                <path
                  d="M2 18 a 16 16 0 0 1 32 0"
                  stroke="#444"
                  strokeWidth={3}
                  fill="none"
                />
                <motion.path
                  stroke="#FFD700"
                  strokeWidth={3}
                  strokeLinecap="round"
                  fill="none"
                  initial={{ strokeDasharray: "0, 50.265" }}
                  animate={{ strokeDasharray: `${circleDash}, ${halfCircleCircumference}` }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  d="M2 18 a 16 16 0 0 1 32 0"
                />
              </svg>
              
              <div className="absolute bottom-0 inset-x-0 text-center text-white">
                <div className="text-lg font-bold mb-1">{roundXp} / {possibleRoundXp} XP</div>
                <div className="text-sm text-gray-300">{roundPercent}% geschafft!</div>
              </div>
            </div>
          </div>
          
          {/* Medaille für diese Runde */}
          {medalImg && (
            <motion.div 
              className="text-center mb-8"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ 
                delay: 1,
                type: "spring",
                stiffness: 200,
                damping: 15
              }}
            >
              <p className="text-white mb-3">
                Glückwunsch, du hast dir eine {medalType}-Medaille verdient!
              </p>
              <img
                src={medalImg}
                alt={medalType}
                className="w-20 h-20 mx-auto"
              />
            </motion.div>
          )}
          
          {/* Coins für diese Runde */}
          <motion.div 
            className="mb-8 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <p className="text-gray-300 mb-2">Gesammelte Münzen in dieser Runde:</p>
            <div className="flex items-center justify-center">
              <span className="text-2xl font-bold text-white">{roundCoins}</span>
              <span className="text-yellow-400 text-2xl ml-2">🪙</span>
            </div>
          </motion.div>
          
          <motion.button
            className="mt-auto bg-green-600 hover:bg-green-700 text-white py-3 px-8 rounded-lg font-bold transition-colors"
            onClick={onRestart}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Wiederholen
          </motion.button>
        </motion.div>
      </div>
    </motion.div>
  );
}
