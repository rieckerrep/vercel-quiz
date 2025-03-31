import { useEffect, useRef } from "react";
import { supabase } from "./supabaseClient";
import { Database } from "./types/supabase";
import { useQuery } from "@tanstack/react-query";

type Profile = Database['public']['Tables']['profiles']['Row'];
type UserStats = Database['public']['Tables']['user_stats']['Row'];

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

  // Profildaten laden
  const { data: profileData } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      if (!user) throw new Error('Nicht eingeloggt');
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
        
      if (error) throw error;
      return data as Profile;
    }
  });

  // Statistiken laden
  const { data: userStats } = useQuery({
    queryKey: ['userStats'],
    queryFn: async () => {
      if (!user) throw new Error('Nicht eingeloggt');
      
      const { data, error } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', user.id)
        .single();
        
      if (error) throw error;
      return data as UserStats;
    },
    refetchInterval: 1000,
    refetchOnWindowFocus: true,
    gcTime: 0
  });

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
    <div className="flex flex-col md:flex-row items-center justify-between p-3 md:p-4 border-b border-gray-200 gap-3 md:gap-0">
      {/* Profil-Bereich */}
      <div className="flex items-center gap-3 w-full md:w-auto justify-center md:justify-start">
        <div className="w-12 h-12 md:w-12 md:h-12 bg-gray-300 rounded-full overflow-hidden">
          {profileData?.avatar_url && (
            <img
              src={profileData.avatar_url}
              alt="Avatar"
              className="w-full h-full object-cover"
            />
          )}
        </div>
        <div className="font-bold text-gray-800 text-base md:text-base">{profileData?.username}</div>
      </div>
      
      {/* Stats und Buttons */}
      <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
        {/* Stats */}
        <div className="flex items-center gap-2 md:gap-3 w-full md:w-auto justify-center">
          <div className="px-3 md:px-4 py-1.5 md:py-2 bg-blue-500 text-white rounded-full flex items-center text-sm md:text-base" ref={xpBoxRef}>
            <span className="font-medium">{userStats?.total_xp || 0}</span>
            <span className="ml-1 text-lg md:text-xl">⭐</span>
          </div>
          <div className="px-3 md:px-4 py-1.5 md:py-2 bg-yellow-400 text-black rounded-full flex items-center text-sm md:text-base" ref={coinBoxRef}>
            <span className="font-medium">{userStats?.total_coins || 0}</span>
            <span className="ml-1 text-lg md:text-xl">🪙</span>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center border-t md:border-t-0 md:border-l border-gray-300 pt-3 md:pt-0 md:pl-3 gap-2 w-full md:w-auto justify-center md:justify-start">
          <button 
            className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center" 
            title="Profil öffnen"
            onClick={onOpenProfile}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 md:h-6 w-5 md:w-6" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
          </button>
          <button 
            className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center" 
            title="Bestenliste öffnen"
            onClick={onOpenLeaderboard}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 md:h-6 w-5 md:w-6" viewBox="0 0 20 20" fill="currentColor">
              <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
            </svg>
          </button>
          <button 
            className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center" 
            title="Shop öffnen"
            onClick={onOpenShop}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 md:h-6 w-5 md:w-6" viewBox="0 0 20 20" fill="currentColor">
              <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
            </svg>
          </button>
          <button 
            className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center" 
            title="Einstellungen öffnen"
            onClick={onOpenSettings}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 md:h-6 w-5 md:w-6" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
            </svg>
          </button>
          <button 
            className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center" 
            title="Abmelden"
            onClick={handleLogout}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 md:h-6 w-5 md:w-6" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V4a1 1 0 00-1-1H3zm11 4a1 1 0 10-2 0v4a1 1 0 102 0V7z" clipRule="evenodd" />
              <path d="M8 7a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export default QuizHeadline;
