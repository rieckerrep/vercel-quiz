import { useEffect, useRef } from "react";
import { supabase } from "./supabaseClient";
import { useUserStore } from "./store/useUserStore";

interface QuizHeadlineProps {
  user: any;
  profile: {
    username: string | null;
    avatar_url: string | null;
  };
  onOpenProfile: () => void;
  onOpenShop: () => void;
  onOpenSettings: () => void;
  onOpenLeaderboard: () => void;
  roundXp: number;
  roundCoins: number;
}

const QuizHeadline: React.FC<QuizHeadlineProps> = ({
  user,
  profile,
  onOpenProfile,
  onOpenShop,
  onOpenSettings,
  onOpenLeaderboard,
  roundXp,
  roundCoins
}) => {
  const xpBoxRef = useRef<HTMLDivElement>(null);
  const coinBoxRef = useRef<HTMLDivElement>(null);
  const { profile: userProfile, userStats, fetchProfile, fetchUserStats } = useUserStore();

  // Profildaten und Statistiken laden
  useEffect(() => {
    if (user?.id) {
      fetchProfile(user.id);
      fetchUserStats(user.id);
    }
  }, [user?.id, fetchProfile, fetchUserStats]);

  const prevXpRef = useRef<number>(userStats?.total_xp ?? 0);
  const prevCoinsRef = useRef<number>(userStats?.total_coins ?? 0);
  const hasMounted = useRef(false);

  useEffect(() => {
    if (!userStats) return;

    if (!hasMounted.current) {
      prevXpRef.current = userStats.total_xp ?? 0;
      prevCoinsRef.current = userStats.total_coins ?? 0;
      hasMounted.current = true;
      return;
    }

    // XP-Animation
    const currentXp = userStats.total_xp ?? 0;
    const xpDiff = currentXp - prevXpRef.current;
    if (xpDiff !== 0 && xpBoxRef.current) {
      const xpChangeEl = document.createElement("div");
      xpChangeEl.classList.add("xp-change");
      xpChangeEl.innerText = xpDiff > 0 ? `+${xpDiff}` : `${xpDiff}`;
      xpChangeEl.classList.add(xpDiff > 0 ? "positive" : "negative");
      xpBoxRef.current.appendChild(xpChangeEl);
      setTimeout(() => {
        xpBoxRef.current &&
          xpChangeEl.parentElement &&
          xpBoxRef.current.removeChild(xpChangeEl);
      }, 2000);
    }
    prevXpRef.current = currentXp;

    // Coins-Animation
    const currentCoins = userStats.total_coins ?? 0;
    const coinDiff = currentCoins - prevCoinsRef.current;
    if (coinDiff !== 0 && coinBoxRef.current) {
      const coinChangeEl = document.createElement("div");
      coinChangeEl.classList.add("coin-change");
      coinChangeEl.innerText = coinDiff > 0 ? `+${coinDiff}` : `${coinDiff}`;
      coinChangeEl.classList.add(coinDiff > 0 ? "positive" : "negative");
      coinBoxRef.current.appendChild(coinChangeEl);
      setTimeout(() => {
        coinBoxRef.current &&
          coinChangeEl.parentElement &&
          coinBoxRef.current.removeChild(coinChangeEl);
      }, 2000);
    }
    prevCoinsRef.current = currentCoins;
  }, [userStats]);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Logout fehlgeschlagen:", error.message);
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="bg-black text-white p-4 md:p-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 md:gap-6">
        {/* Linke Seite: Benutzerinfo */}
        <div className="flex items-center gap-3 md:gap-4">
          <div className="relative">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gray-800 flex items-center justify-center overflow-hidden">
              {userProfile?.avatar_url ? (
                <img
                  src={userProfile.avatar_url}
                  alt={userProfile.username || "Benutzer"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <svg className="w-6 h-6 md:w-8 md:h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              )}
            </div>
            <button
              onClick={onOpenProfile}
              className="absolute -bottom-1 -right-1 bg-yellow-400 text-black w-5 h-5 md:w-6 md:h-6 rounded-full flex items-center justify-center hover:bg-yellow-500 transition-colors"
            >
              <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
          </div>
          <div>
            <h2 className="text-lg md:text-xl font-bold">{userProfile?.username || "Benutzer"}</h2>
            <p className="text-sm md:text-base text-gray-400">{user.email}</p>
          </div>
        </div>

        {/* Rechte Seite: Statistiken */}
        <div className="flex items-center gap-4 md:gap-6">
          {/* XP */}
          <div className="flex items-center gap-2 bg-gray-800 px-3 py-1.5 md:px-4 md:py-2 rounded" ref={xpBoxRef}>
            <span className="text-yellow-400 text-lg md:text-xl">⭐</span>
            <span className="font-medium text-sm md:text-base">{userStats?.total_xp ?? 0}</span>
          </div>

          {/* Münzen */}
          <div className="flex items-center gap-2 bg-gray-800 px-3 py-1.5 md:px-4 md:py-2 rounded" ref={coinBoxRef}>
            <span className="text-yellow-400 text-lg md:text-xl">🪙</span>
            <span className="font-medium text-sm md:text-base">{userStats?.total_coins ?? 0}</span>
          </div>

          {/* Buttons als Icons */}
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenProfile}
              className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors"
              title="Profil öffnen"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 md:h-6 w-5 md:w-6 text-white" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
            </button>

            <button
              onClick={onOpenLeaderboard}
              className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors"
              title="Bestenliste öffnen"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 md:h-6 w-5 md:w-6 text-white" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
              </svg>
            </button>

            <button
              onClick={onOpenShop}
              className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors"
              title="Shop öffnen"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 md:h-6 w-5 md:w-6 text-white" viewBox="0 0 20 20" fill="currentColor">
                <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
              </svg>
            </button>

            <button
              onClick={onOpenSettings}
              className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors"
              title="Einstellungen öffnen"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 md:h-6 w-5 md:w-6 text-white" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
              </svg>
            </button>

            <button
              onClick={handleLogout}
              className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors"
              title="Abmelden"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 md:h-6 w-5 md:w-6 text-white" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V4a1 1 0 00-1-1H3zm11 4a1 1 0 10-2 0v4a1 1 0 102 0V7z" clipRule="evenodd" />
                <path d="M8 7a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default QuizHeadline;
