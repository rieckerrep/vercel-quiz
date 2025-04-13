// LoginScreen.tsx
import React, { useEffect, useState, useRef } from "react";
import { supabase } from "./lib/supabaseClient";
import { motion } from "framer-motion";
import "./LoginScreen.css";
import { authService } from "./api/authService";
import { Database } from "./lib/supabase";

interface LoginScreenProps {
  onLogin: (userId: string) => void;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [universities, setUniversities] = useState<string[]>([]);
  const [selectedUniversity, setSelectedUniversity] = useState<string>("");

  // Felder fürs Registrieren
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Audio
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Lade Universitäten beim Start
  useEffect(() => {
    async function loadUniversities() {
      try {
        const { data, error } = await authService.fetchUniversities();
        if (error) {
          console.error("Fehler beim Laden der Universitäten:", error);
          return;
        }
        
        if (data) {
          setUniversities(data.map(uni => uni.name));
        }
      } catch (err) {
        console.error("Fehler beim Laden der Universitäten:", err);
      }
    }
    
    loadUniversities();
  }, []);

  // Sound abspielen
  const playSound = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch((err) => {
        console.error("Audio Fehler:", err);
      });
    }
  };

  // ---------------------
  // 1) Registrierung
  // ---------------------
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || !password || !username || !selectedUniversity) {
      setError("❗ Bitte alle Felder ausfüllen!");
      return;
    }
    try {
      // Prüfe, ob Benutzername bereits existiert
      const { data: existingUser, error: existingError } = await supabase
        .from("profiles")
        .select("username")
        .eq("username", username);

      if (existingUser && existingUser.length > 0) {
        setError("❗ Benutzername bereits vergeben!");
        return;
      }
      
      // Registrierung mit authService
      const { data, error } = await authService.register(email, password, username, selectedUniversity);
      
      if (error) {
        setError("❌ Registrierung fehlgeschlagen: " + error.message);
        return;
      }
      
      if (!data?.user) {
        setError("❌ Registrierung fehlgeschlagen: Kein user Objekt.");
        return;
      }
      
      // Sound / Nachricht
      setMessage("✅ Registrierung erfolgreich! Bitte bestätige deine E-Mail.");
      playSound();

      onLogin(data.user.id);
    } catch (err: any) {
      console.error("Registrierung Fehler:", err);
      setError("❌ Registrierung fehlgeschlagen.");
    }
  };

  // ---------------------
  // 2) Login
  // ---------------------
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || !password) {
      setError("❗ Bitte E-Mail und Passwort eingeben!");
      return;
    }
    try {
      const { data, error } = await authService.login(email, password);
      
      if (error) {
        setError("❌ Login fehlgeschlagen: " + error.message);
      } else if (data && data.user) {
        onLogin(data.user.id);
      } else {
        setError("❌ Login fehlgeschlagen: Keine Benutzerdaten erhalten.");
      }
    } catch (err: any) {
      console.error("Login - Fehler:", err);
      setError("❌ Login fehlgeschlagen.");
    }
  };

  // ---------------------
  // 3) Social Login
  // ---------------------
  const handleOAuthLogin = async (provider: "google" | "facebook") => {
    setMessage("");
    try {
      const { data, error } = await authService.socialLogin(provider);
      
      if (error) {
        setMessage("❌ " + provider + " Login fehlgeschlagen: " + error.message);
      } else if (data && data.user) {
        onLogin(data.user.id);
      }
    } catch (err: any) {
      console.error("OAuth Login Fehler:", err);
      setMessage("❌ " + provider + " Login fehlgeschlagen.");
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  const formVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.3 } }
  };

  return (
    <motion.div 
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#151923] to-[#1a202c] p-4"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <motion.div 
        className="w-full max-w-md bg-[#202431] rounded-2xl shadow-2xl p-8 border border-gray-700"
        variants={formVariants}
      >
        <div className="text-center mb-8">
          <motion.img
            src="https://lqoulygftdjbnfxkrihy.supabase.co/storage/v1/object/public/quiz-assets/Logo.svg"
            alt="Logo"
            className="w-24 h-24 mx-auto mb-4"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
          />
          <h1 className="text-3xl font-bold text-white mb-2">
            {isRegisterMode ? "Registrierung" : "Willkommen"}
          </h1>
          <p className="text-gray-400">
            {isRegisterMode 
              ? "Erstelle deinen Account für das Quiz" 
              : "Melde dich an, um das Quiz zu starten"}
          </p>
        </div>

        <form onSubmit={isRegisterMode ? handleRegister : handleLogin} className="space-y-6">
          {isRegisterMode && (
            <>
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Benutzername
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 bg-[#1a202c] border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                  placeholder="Wähle einen Benutzernamen"
                  required
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Universität
                </label>
                <select
                  value={selectedUniversity}
                  onChange={(e) => setSelectedUniversity(e.target.value)}
                  className="w-full px-4 py-3 bg-[#1a202c] border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                  required
                >
                  {universities.map((uni, index) => (
                    <option key={index} value={uni}>
                      {uni}
                    </option>
                  ))}
                </select>
              </motion.div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              E-Mail
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-[#1a202c] border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
              placeholder="deine@email.de"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Passwort
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-[#1a202c] border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition duration-200"
              >
                {showPassword ? "👁️‍🗨️" : "👁️‍🗨️"}
              </button>
            </div>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-3 bg-red-900/20 border border-red-500 rounded-lg text-red-400 text-sm"
            >
              {error}
            </motion.div>
          )}

          {message && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-3 bg-green-900/20 border border-green-500 rounded-lg text-green-400 text-sm"
            >
              {message}
            </motion.div>
          )}

          <motion.button
            type="submit"
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition duration-200 flex items-center justify-center gap-2"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {isRegisterMode ? "Registrieren" : "Anmelden"}
          </motion.button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-[#202431] text-gray-400">Oder</span>
            </div>
          </div>

          <div className="space-y-3">
            <motion.button
              type="button"
              onClick={() => handleOAuthLogin("google")}
              className="w-full py-3 bg-white hover:bg-gray-100 text-gray-900 font-medium rounded-lg transition duration-200 flex items-center justify-center gap-2 border border-gray-200"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <img
                src="https://lqoulygftdjbnfxkrihy.supabase.co/storage/v1/object/public/community//google.svg"
                alt="Google"
                className="w-5 h-5"
              />
              Mit Google anmelden
            </motion.button>

            <motion.button
              type="button"
              onClick={() => handleOAuthLogin("facebook")}
              className="w-full py-3 bg-[#1877F2] hover:bg-[#166FE5] text-white font-medium rounded-lg transition duration-200 flex items-center justify-center gap-2"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <img
                src="https://lqoulygftdjbnfxkrihy.supabase.co/storage/v1/object/public/community//facebook.svg"
                alt="Facebook"
                className="w-5 h-5"
              />
              Mit Facebook anmelden
            </motion.button>
          </div>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsRegisterMode(!isRegisterMode);
              setMessage("");
              setUsername("");
              setEmail("");
              setPassword("");
            }}
            className="text-sm text-gray-400 hover:text-white transition duration-200"
          >
            {isRegisterMode ? "Bereits registriert? Hier anmelden" : "Noch kein Account? Hier registrieren"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default LoginScreen;
