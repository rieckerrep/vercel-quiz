import { useState, useEffect } from "react";
import "./index.css";
import { LoginScreen } from "./LoginScreen";
import QuizContainer from "./QuizContainer";
import ProfileScreen from "./ProfileScreen";
import ShopScreen from "./ShopScreen";
import LeaderboardOverlay from "./LeaderboardOverlay";
import { supabase } from "./supabaseClient";
import { useQuery, useQueryClient } from "@tanstack/react-query";

function App() {
  const [userId, setUserId] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [activeScreen, setActiveScreen] = useState<
    "quiz" | "profile" | "shop" | "leaderboard" | "settings"
  >("quiz");
  
  const queryClient = useQueryClient();

  const handleLogin = (userId: string) => {
    setUserId(userId);
    setActiveScreen("quiz");
  };

  // Session abrufen
  useEffect(() => {
    async function getSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
    }
    getSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event: any, session: any) => {
        setUser(session?.user ?? null);
      }
    );
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Profil laden
  const {
    data: profileData,
    isLoading: profileLoading,
    error: profileError,
  } = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!userId,
  });

  // User-Stats laden
  const {
    data: userStatsData,
    isLoading: statsLoading,
    error: statsError,
  } = useQuery({
    queryKey: ["userStats", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_stats")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) return null;
      return {
        ...data,
        total_xp: Number(data.total_xp),
        total_coins: Number(data.total_coins),
        gold_medals: Number(data.gold_medals),
        silver_medals: Number(data.silver_medals),
        bronze_medals: Number(data.bronze_medals),
      };
    },
    enabled: !!userId,
  });

  if (!user) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  if (profileLoading || statsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-lg">
        Lade Profil und Stats...
      </div>
    );
  }

  if (profileError || statsError) {
    return (
      <div className="min-h-screen flex items-center justify-center text-lg text-red-500">
        Fehler: {(profileError || statsError)?.message}
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full">
      {/* Quiz-Screen */}
      {activeScreen === "quiz" && (
        <div className="absolute top-0 left-0 w-full min-h-screen bg-lightBg p-4">
          <QuizContainer
            user={user}
            profile={profileData}
            userStats={userStatsData}
            onOpenProfile={() => setActiveScreen("profile")}
            onOpenShop={() => setActiveScreen("shop")}
            onOpenLeaderboard={() => setActiveScreen("leaderboard")}
            onOpenSettings={() => setActiveScreen("settings")}
          />
        </div>
      )}

      {/* Profile-Overlay */}
      {activeScreen === "profile" && (
        <div className="absolute top-0 left-0 w-full min-h-screen bg-lightBg p-4">
          <ProfileScreen
            onBack={() => setActiveScreen("quiz")}
            user={user}
            profile={profileData}
            userStats={userStatsData}
          />
        </div>
      )}

      {/* Shop-Overlay */}
      {activeScreen === "shop" && (
        <div className="absolute top-0 left-0 w-full min-h-screen bg-lightBg p-0 md:p-4">
          <ShopScreen
            user={user}
            onClose={() => setActiveScreen("quiz")}
            onOpenProfile={() => setActiveScreen("profile")}
          />
        </div>
      )}

      {/* Leaderboard-Overlay */}
      {activeScreen === "leaderboard" && (
        <div className="absolute top-0 left-0 w-full min-h-screen bg-lightBg p-4">
          <LeaderboardOverlay
            onClose={() => setActiveScreen("quiz")}
          />
        </div>
      )}
    </div>
  );
}

export default App;
