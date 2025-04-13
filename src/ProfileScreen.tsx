import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "./ProfileScreen.css";
import { supabase } from "./lib/supabaseClient";
import { userService } from "./api/userService";
import { authService } from "./api/authService";
import { Database } from "./lib/supabase";
import { Profile, UserStats } from "./types/profile";
import { LevelData, LeagueData } from "./types/quiz";

/** Datenstrukturen **/
interface ProfileScreenProps {
  user: any;
  profile: any;
  userStats: any;
  onBack: () => void;
}

export default function ProfileScreen({ onBack }: ProfileScreenProps) {
  // ========== STATES ==========
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [levelData, setLevelData] = useState<LevelData | null>(null);
  const [leagueData, setLeagueData] = useState<LeagueData | null>(null);

  // Medaillen
  const [animatedMedals, setAnimatedMedals] = useState({
    gold: 0,
    silver: 0,
    bronze: 0,
  });

  // Kreis-Fortschritt (Vollkreis, Logik wie EndScreen)
  const [circleDash, setCircleDash] = useState(0);
  const circleCircumference = 100.53; // ~ 2π*16, analog EndScreen
  // (Falls du dort 50.265 nutzt für den Halbkreis, hier wäre ~100.53 für den ganzen Kreis)

  // Nächstes Level
  const [nextLevelXP, setNextLevelXP] = useState<number | null>(null);

  // Overlay
  const [showSettings, setShowSettings] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [universities, setUniversities] = useState<string[]>([]);
  const [selectedUniversity, setSelectedUniversity] = useState("");

  // ========== LOAD DATA ==========
  // 1) Session => Profil + Stats
  useEffect(() => {
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) return;
      const user = session.user;

      // A) Profil
      const { data: profileData } = await supabase
        .from("profiles")
        .select("username, university, avatar_url")
        .eq("id", user.id)
        .maybeSingle();
      setProfile(profileData ? {
        ...profileData,
        id: user.id,
        level: 0,
        xp: 0,
        coins: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } : null);

      // B) Stats
      const { data: statsData } = await supabase
        .from("user_stats")
        .select(
          "gold_medals, silver_medals, bronze_medals, total_coins, total_xp, level, current_league"
        )
        .eq("user_id", user.id)
        .maybeSingle();

      if (statsData) {
        setStats({
          gold: statsData.gold_medals || 0,
          silver: statsData.silver_medals || 0,
          bronze: statsData.bronze_medals || 0,
          total_coins: statsData.total_coins || 0,
          total_xp: statsData.total_xp || 0,
          level: statsData.level || 1,
          current_league: statsData.current_league || "Holzliga",
        });
      }
    })();
  }, []);

  // 2) Level + Liga
  useEffect(() => {
    if (!stats) return;
    (async () => {
      // Level
      const { data: levelRow } = await supabase
        .from("levels")
        .select("*")
        .eq("id", stats.level)
        .maybeSingle();
      if (levelRow) {
        setLevelData({
          id: levelRow.id,
          level_title: levelRow.level_title || "Unbekanntes Level",
          xp_required: levelRow.xp_required,
          level_image: levelRow.level_image || "",
          level_number: levelRow.level_number
        });
        // Nächstes Level
        const nextLevelId = levelRow.id + 1;
        const { data: nextLevel } = await supabase
          .from("levels")
          .select("xp_required")
          .eq("id", nextLevelId)
          .maybeSingle();
        const nextXP = nextLevel
          ? nextLevel.xp_required
          : levelRow.xp_required + 100;
        setNextLevelXP(nextXP);
      }

      // Liga
      const { data: leagueRow } = await supabase
        .from("leagues")
        .select("*")
        .eq("name", stats.current_league)
        .maybeSingle();
      if (leagueRow) {
        setLeagueData({
          id: leagueRow.id,
          name: leagueRow.name,
          league_img: leagueRow.league_img || ""
        });
      }
    })();
  }, [stats]);

  // 3) Medaillen animieren
  useEffect(() => {
    if (!stats) return;
    setAnimatedMedals({
      gold: stats.gold,
      silver: stats.silver,
      bronze: stats.bronze,
    });
  }, [stats]);

  // 4) Kreis-Fortschritt (Vollkreis, wie EndScreen)
  useEffect(() => {
    if (!stats || !levelData || !nextLevelXP) return;
    const xpNow = stats.total_xp;
    const xpCurrent = levelData.xp_required;
    const xpNeeded = nextLevelXP - xpCurrent;
    const userProgress = xpNow - xpCurrent;

    let ratio = 0;
    if (xpNeeded > 0) {
      ratio = userProgress / xpNeeded;
      if (ratio < 0) ratio = 0;
      if (ratio > 1) ratio = 1;
    }
    const finalProgress = ratio * circleCircumference;

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
  }, [stats, levelData, nextLevelXP]);

  // 5) Unis => Select
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("universities")
        .select("name")
        .order("name", { ascending: true });
      if (!error && data) {
        const list = data.map((row: any) => row.name);
        setUniversities(list);
      }
    })();
  }, []);

  // ========== HELPER ==========
  function isValidUsername(name: string) {
    const lower = name.toLowerCase();
    const banned = ["hitler", "pussyslayer", "nazi", "fick", "arsch"];
    return !banned.some((w) => lower.includes(w));
  }

  // ========== SETTINGS SAVE ==========
  async function handleSaveSettings() {
    if (!profile) return;
    
    const { data: sessionData } = await authService.getSession();
    const user = sessionData?.user;
    
    if (!user) {
      alert("Keine Session. Bitte neu einloggen.");
      return;
    }

    // 1) Neuer Benutzername
    if (newUsername) {
      if (!isValidUsername(newUsername)) {
        alert("Dieser Benutzername enthält unerlaubte Inhalte.");
        return;
      }
      // check if taken
      const { data: existing } = await supabase
        .from("profiles")
        .select("username")
        .eq("username", newUsername.toLowerCase());
      if (existing && existing.length > 0) {
        alert("Benutzername bereits vergeben!");
        return;
      }
    }

    // 2) Update profiles
    const updateObj: any = {};
    if (newUsername) updateObj.username = newUsername;
    if (selectedUniversity) updateObj.university = selectedUniversity;

    if (Object.keys(updateObj).length > 0) {
      const { error } = await userService.updateProfile(user.id, updateObj);
      if (error) {
        alert("Fehler beim Aktualisieren des Profils: " + error.message);
        return;
      }
      
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              username: newUsername || prev.username,
              university: selectedUniversity || prev.university,
            }
          : null
      );
    }

    // 3) Passwort
    if (newPassword) {
      if (!oldPassword) {
        alert("Bitte altes Passwort eingeben!");
        return;
      }
      
      // Überprüfe altes Passwort
      const { error: signInError } = await authService.login(user.email!, oldPassword);
      if (signInError) {
        alert("Altes Passwort ist falsch!");
        return;
      }
      
      // Passwort ändern
      const { error: passError } = await authService.changePassword(newPassword);
      if (passError) {
        alert("Fehler beim Passwort-Update: " + passError.message);
        return;
      }
    }
    
    // Erfolgsmeldung
    alert("Einstellungen erfolgreich gespeichert!");
    setShowSettings(false);
    // Felder leeren
    setNewUsername("");
    setSelectedUniversity("");
    setOldPassword("");
    setNewPassword("");
  }

  // Ladezustand
  if (!profile || !stats) {
    return (
      <div className="profile-screen-container bg-gray-900">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center h-full"
        >
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            className="w-16 h-16 border-4 border-yellow-400 border-t-transparent rounded-full mb-4"
          />
          <h2 className="text-xl text-white">Profil wird geladen...</h2>
        </motion.div>
      </div>
    );
  }

  // xpNow / xpNext
  const xpNow = stats.total_xp;
  const xpNext = nextLevelXP || (levelData?.xp_required ?? 0) + 100;
  const xpProgress = ((xpNow - (levelData?.xp_required || 0)) / (xpNext - (levelData?.xp_required || 0))) * 100;
  
  // Berechne den aktuellen Level-Fortschritt für die Anzeige unter dem Avatar
  const currentLevelXp = xpNow - (levelData?.xp_required || 0);
  const nextLevelDiff = xpNext - (levelData?.xp_required || 0);

  const renderMedals = () => {
    const medalCounts = {
      gold: stats?.gold || 0,
      silver: stats?.silver || 0,
      bronze: stats?.bronze || 0
    };

    return (
      <div className="medals-container">
        <div className="medal gold">
          <span className="count">{medalCounts.gold}</span>
        </div>
        <div className="medal silver">
          <span className="count">{medalCounts.silver}</span>
        </div>
        <div className="medal bronze">
          <span className="count">{medalCounts.bronze}</span>
        </div>
      </div>
    );
  };

  return (
    <motion.div 
      className="profile-screen-container bg-[#151923]"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* ===== Top-Bar ===== */}
      <div className="bg-[#10131c] p-4 flex items-center justify-between">
        <motion.button
          className="w-8 h-8 flex items-center justify-center text-white"
          onClick={onBack}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </motion.button>
        
        <h2 className="text-2xl font-bold text-white">Dein Profil</h2>
        
        <motion.button
          className="bg-gray-800 p-2 rounded-full hover:bg-gray-700 transition-colors"
          onClick={() => {
            setNewUsername("");
            setSelectedUniversity("");
            setOldPassword("");
            setNewPassword("");
            setShowSettings(true);
          }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5 text-white">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </motion.button>
      </div>

      {/* Hauptinhalt */}
      <div className="p-6 flex-1">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Linke Spalte: Avatar & Level-Ring */}
          <motion.div 
            className="flex flex-col items-center"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="relative">
              {/* Äußerer Ring mit Progress */}
              <div className="relative w-48 h-48">
                <svg className="w-full h-full" viewBox="0 0 36 36">
                  {/* Hintergrund (voller Kreis) */}
                  <path
                    d="M18 2.0845
                       a 15.9155 15.9155 0 0 1 0 31.831
                       a 15.9155 15.9155 0 0 1 0 -31.831"
                    stroke="#444"
                    strokeWidth={2.8}
                    fill="none"
                  />
                  {/* Fortschritt */}
                  <motion.path
                    stroke="#FFD700"
                    strokeWidth={2.8}
                    strokeLinecap="round"
                    fill="none"
                    initial={{ strokeDasharray: "0, 100.53" }}
                    animate={{ strokeDasharray: `${circleDash}, ${circleCircumference}` }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    d="M18 2.0845
                       a 15.9155 15.9155 0 0 1 0 31.831
                       a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                
                {/* Dunkler Hintergrundkreis für das Avatar-Bild */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[125px] h-[125px] rounded-full bg-[#1e2130]"></div>
                
                {/* Avatar in der Mitte des Rings */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[115px] h-[115px] rounded-full overflow-hidden border-2 border-yellow-400">
                  <motion.div 
                    className="w-full h-full"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.5, type: "spring" }}
                  >
                    <img 
                      src={profile.avatar_url || "https://lqoulygftdjbnfxkrihy.supabase.co/storage/v1/object/public/quiz-assets/default-avatar.png"} 
                      alt="Profilbild"
                      className="w-full h-full object-cover object-center"
                    />
                  </motion.div>
                </div>
              </div>

              {/* Level-Info unter dem Avatar */}
              <motion.div 
                className="mt-4 flex flex-col items-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
              >
                <div className="flex items-center mb-2">
                  {levelData?.level_image && (
                    <img
                      className="w-8 h-8 mr-2"
                      src={levelData.level_image}
                      alt="Level-Bild"
                    />
                  )}
                  <h3 className="text-xl font-bold text-white">
                    {levelData?.level_title || "Level"}
                  </h3>
                </div>
                
                {/* Fortschrittsbalken für XP */}
                <div className="w-full bg-[#202431] rounded-full h-2 mb-1 overflow-hidden">
                  <motion.div 
                    className="bg-yellow-400 h-full rounded-full" 
                    initial={{ width: "0%" }}
                    animate={{ width: `${xpProgress}%` }}
                    transition={{ duration: 1, delay: 0.9 }}
                  />
                </div>
                
                <p className="text-gray-400 text-sm">
                  {currentLevelXp} / {nextLevelDiff} XP
                </p>
              </motion.div>
            </div>
          </motion.div>

          {/* Mittlere Spalte: Benutzerinfos */}
          <motion.div 
            className="md:col-span-2 bg-[#202431] rounded-lg p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white mb-3 md:mb-0">{profile.username}</h2>
              
              <div className="flex space-x-6">
                {renderMedals()}
              </div>
            </div>
            
            <div className="mb-6">
              <div className="text-gray-400 mb-1">Hochschule</div>
              <p className="text-white">{profile.university || "Keine Hochschule angegeben"}</p>
            </div>
            
            <div className="mb-6">
              <div className="text-gray-400 mb-1">Gesamte XP</div>
              <motion.p 
                className="text-white text-xl"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9 }}
              >
                {stats.total_xp} XP
              </motion.p>
            </div>
            
            <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-8">
              <div>
                <div className="text-gray-400 mb-1">Münzen</div>
                <motion.div 
                  className="flex items-center"
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.8 }}
                >
                  <span className="text-xl text-white mr-2">{stats.total_coins}</span>
                  <span className="text-yellow-400 text-xl">🪙</span>
                </motion.div>
              </div>
              
              <div>
                <div className="text-gray-400 mb-1">Liga</div>
                <div className="flex items-center">
                  {leagueData?.league_img && (
                    <motion.img
                      className="w-8 h-8 mr-2"
                      src={leagueData.league_img}
                      alt="Liga-Icon"
                      initial={{ rotate: -180, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      transition={{ delay: 1, type: "spring" }}
                    />
                  )}
                  <span className="text-white">{leagueData?.name || "Keine Liga"}</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
        
        {/* Zurück-Button */}
        <div className="mt-8 flex justify-center">
          <motion.button 
            className="bg-green-600 hover:bg-green-700 text-white py-3 px-8 rounded-lg font-bold transition-colors"
            onClick={onBack}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Zurück zum Quiz
          </motion.button>
        </div>
      </div>

      {/* Einstellungen-Overlay */}
      <AnimatePresence>
        {showSettings && (
          <motion.div 
            className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div 
              className="bg-gray-800 rounded-lg p-6 w-full max-w-md relative"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25 }}
            >
              <motion.button
                className="absolute top-4 right-4 bg-gray-700 text-gray-300 w-8 h-8 rounded-full flex items-center justify-center"
                onClick={() => setShowSettings(false)}
                whileHover={{ scale: 1.1, backgroundColor: "#4B5563" }}
                whileTap={{ scale: 0.95 }}
              >
                ✕
              </motion.button>
              
              <h2 className="text-xl text-white font-bold mb-6 text-center">Profil bearbeiten</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-300 mb-2">Neuer Benutzername</label>
                  <input
                    type="text"
                    autoComplete="off"
                    value={newUsername}
                    placeholder="Neuer Benutzername"
                    onChange={(e) => setNewUsername(e.target.value)}
                    className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                </div>
                
                <div>
                  <label className="block text-gray-300 mb-2">Hochschule ändern</label>
                  <select
                    value={selectedUniversity}
                    onChange={(e) => setSelectedUniversity(e.target.value)}
                    className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  >
                    <option value="">(keine Änderung)</option>
                    {universities.map((uni) => (
                      <option key={uni} value={uni}>
                        {uni}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-gray-300 mb-2">Altes Passwort</label>
                  <input
                    type="password"
                    autoComplete="off"
                    value={oldPassword}
                    placeholder="Altes Passwort"
                    onChange={(e) => setOldPassword(e.target.value)}
                    className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                </div>
                
                <div>
                  <label className="block text-gray-300 mb-2">Neues Passwort</label>
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={newPassword}
                    placeholder="Neues Passwort"
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                </div>
                
                <div className="flex justify-center space-x-4 mt-6">
                  <motion.button
                    onClick={handleSaveSettings}
                    className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold"
                    whileHover={{ scale: 1.05, backgroundColor: "#059669" }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Speichern
                  </motion.button>
                  
                  <motion.button
                    onClick={() => setShowSettings(false)}
                    className="bg-gray-600 text-white px-6 py-2 rounded-lg font-bold"
                    whileHover={{ scale: 1.05, backgroundColor: "#4B5563" }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Abbrechen
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
