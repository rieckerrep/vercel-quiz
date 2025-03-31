import React, { useState, useEffect } from "react";
import "./index.css"; // oder tailwind.css – Deine zentrale CSS-Datei
import QuizContainer from "./QuizContainer";
import LoginScreen from "./LoginScreen";
import ProfileScreen from "./ProfileScreen";
import ShopScreen from "./ShopScreen";
import LeaderboardOverlay from "./LeaderboardOverlay";
import { supabase } from "./supabaseClient";
import { useQuery, useQueryClient } from "@tanstack/react-query";

function App() {
  const [user, setUser] = useState<any>(null);
  // activeScreen kann "quiz", "profile", "shop" oder "leaderboard" sein
  const [activeScreen, setActiveScreen] = useState<
    "quiz" | "profile" | "shop" | "leaderboard"
  >("quiz");
  
  const queryClient = useQueryClient();

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
    data: profile,
    isLoading: profileLoading,
    error: profileError,
  } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!user,
  });

  // User-Stats laden
  const {
    data: userStats,
    isLoading: statsLoading,
    error: statsError,
  } = useQuery({
    queryKey: ["userStats", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_stats")
        .select("*")
        .eq("user_id", user!.id)
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
    enabled: !!user,
  });

  if (!user) {
    return <LoginScreen />;
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
            profile={profile}
            userStats={userStats}
            onOpenProfile={() => setActiveScreen("profile")}
            onOpenShop={() => setActiveScreen("shop")}
            onOpenLeaderboard={() => setActiveScreen("leaderboard")}
          />
        </div>
      )}

      {/* Profile-Overlay */}
      {activeScreen === "profile" && (
        <div className="absolute top-0 left-0 w-full min-h-screen bg-lightBg p-4">
          <ProfileScreen
            onBack={() => setActiveScreen("quiz")}
            user={user}
            profile={profile}
            userStats={userStats}
          />
        </div>
      )}

      {/* Shop-Overlay */}
      {activeScreen === "shop" && (
        <div className="absolute top-0 left-0 w-full min-h-screen bg-lightBg p-4">
          <ShopScreen
            userId={user.id}
            profile={profile}
            userStats={userStats}
            onBack={() => setActiveScreen("quiz")}
            updateUserStats={(updates) => {
              // Aktualisiere die Benutzerstatistiken im lokalen State
              queryClient.setQueryData(["userStats", user.id], {
                ...userStats,
                ...updates
              });
              
              // ReactQuery Cache aktualisieren
              queryClient.invalidateQueries({
                queryKey: ["userStats", user.id]
              });
            }}
            updateActiveAvatar={(avatarUrl) => {
              // Aktualisiere das Profilbild im lokalen State
              queryClient.setQueryData(["profile", user.id], {
                ...profile,
                avatar_url: avatarUrl
              });
              
              // ReactQuery Cache aktualisieren, damit alle Komponenten das neue Profilbild sehen
              queryClient.invalidateQueries({
                queryKey: ["profile", user.id]
              });
            }}
          />
        </div>
      )}

      {/* Leaderboard-Overlay */}
      {activeScreen === "leaderboard" && (
        <div className="absolute top-0 left-0 w-full min-h-screen bg-lightBg p-4">
          <LeaderboardOverlay
            currentUserId={user.id}
            leagueName="Bronzeliga"
            onClose={() => setActiveScreen("quiz")}
          />
        </div>
      )}
    </div>
  );
}

export default App;
