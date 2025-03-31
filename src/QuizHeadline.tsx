import React, { useEffect, useRef } from "react";
import { supabase } from "./supabaseClient";

interface QuizHeadlineProps {
  user: any;
  userStats: {
    total_xp: number;
    total_coins: number;
  } | null;
  profile: {
    username: string;
    avatar_url: string;
    id: string;
  } | null;
  onOpenProfile: () => void;
  onOpenShop: () => void;
  onOpenLeaderboard: () => void;
  roundCoins?: number;
}

export default function QuizHeadline({
  user,
  userStats,
  profile,
  onOpenProfile,
  onOpenShop,
  onOpenLeaderboard,
  roundCoins = 0
}: QuizHeadlineProps) {
  const xpBoxRef = useRef<HTMLDivElement>(null);
  const coinBoxRef = useRef<HTMLDivElement>(null);

  const prevXpRef = useRef<number>(userStats?.total_xp || 0);
  const prevCoinsRef = useRef<number>(userStats?.total_coins || 0);
  const hasMounted = useRef(false);

  useEffect(() => {
    if (!userStats) return;

    if (!hasMounted.current) {
      prevXpRef.current = userStats.total_xp;
      prevCoinsRef.current = userStats.total_coins;
      hasMounted.current = true;
      return;
    }

    // XP-Animation
    const currentXp = userStats.total_xp;
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
    const currentCoins = userStats.total_coins;
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
    <div className="flex items-center justify-between p-4 border-b border-gray-200">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-gray-300 rounded-full overflow-hidden">
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt="Avatar"
              className="w-full h-full object-cover"
            />
          ) : null}
        </div>
        <div className="font-bold text-gray-800">{profile?.username || "MarceliTheBoss"}</div>
      </div>
      
      <div className="flex items-center gap-3">
        <div className="px-4 py-2 bg-blue-500 text-white rounded-full flex items-center" ref={xpBoxRef}>
          <span className="font-medium">{userStats?.total_xp || 200}</span>
          <span className="ml-1">⭐</span>
        </div>
        <div className="px-4 py-2 bg-yellow-400 text-black rounded-full flex items-center" ref={coinBoxRef}>
          <span className="font-medium">Gesamt: {userStats?.total_coins || 34}</span>
          <span className="ml-1">🪙</span>
        </div>
        <div className="px-4 py-2 bg-yellow-400 text-black rounded-full flex items-center">
          <span className="font-medium">Runde: {roundCoins}</span>
          <span className="ml-1">🪙</span>
        </div>
        <div className="flex border-l border-gray-300 pl-3 ml-2 gap-2">
          <button 
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center" 
            title="Profil öffnen"
            onClick={onOpenProfile}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
          </button>
          <button 
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center" 
            title="Bestenliste öffnen"
            onClick={onOpenLeaderboard}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
            </svg>
          </button>
          <button 
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center" 
            title="Shop öffnen"
            onClick={onOpenShop}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
            </svg>
          </button>
          <button 
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center" 
            title="Abmelden"
            onClick={handleLogout}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V4a1 1 0 00-1-1H3zm11 4a1 1 0 10-2 0v4a1 1 0 102 0V7z" clipRule="evenodd" />
              <path d="M8 7a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
