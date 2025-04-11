import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import "./ShopScreen.css";
import { supabase } from "./lib/supabaseClient";
import { useUserStore } from "./store/useUserStore";
import { useQuizStore } from "./store/useQuizStore";
import { shopService } from "./api/shopService";
import { Database } from "./lib/supabase";

type Profile = Database['public']['Tables']['profiles']['Row'];
type UserStats = Database['public']['Tables']['user_stats']['Row'];

interface Notification {
  message: string;
  type: "success" | "error";
}

interface ShopAvatar {
  id: number;
  title: string | null;
  category: string | null;
  image_url: string;
  price: number;
  active: boolean | null;
}

interface ShopScreenProps {
  user: any;
  onClose: () => void;
  onOpenProfile: () => void;
}

const ShopScreen: React.FC<ShopScreenProps> = ({
  user,
  onClose,
  onOpenProfile,
}) => {
  const [shopAvatars, setShopAvatars] = useState<ShopAvatar[]>([]);
  const [ownedAvatars, setOwnedAvatars] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [sortOption, setSortOption] = useState<"name" | "price">("name");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [animating, setAnimating] = useState(false);
  const [notification, setNotification] = useState<Notification | null>(null);
  
  // Store-Hooks
  const { userStats, fetchUserStats } = useUserStore();
  const { roundCoins, setRoundCoins } = useQuizStore();

  // Funktion zur Korrektur der Image-URLs - nur für URL-Formatkorrektur
  const fixImageUrl = (url: string): string => {
    // URL-Format korrigieren
    if (!url.startsWith('https://')) {
      if (url.startsWith('https:/')) {
        url = 'https://' + url.substring(7);
      } else if (url.startsWith('http:/')) {
        url = 'http://' + url.substring(6);
      }
    }
    
    return url;
  };

  // Lade Avatare beim Start
  useEffect(() => {
    async function loadAvatars() {
      setLoading(true);
      try {
        // Lade Shop-Avatare
        const { data: avatars, error: avatarsError } = await shopService.fetchAvatars();
        if (avatarsError) {
          console.error("Fehler beim Laden der Avatare:", avatarsError);
          setLoading(false);
          return;
        }
        
        if (avatars) {
          setShopAvatars(avatars);
        }
        
        // Lade gekaufte Avatare
        const { data: userAvatars, error: userAvatarsError } = await shopService.fetchUserAvatars(user.id);
        if (userAvatarsError) {
          console.error("Fehler beim Laden der gekauften Avatare:", userAvatarsError);
          setLoading(false);
          return;
        }
        
        if (userAvatars) {
          const ownedIds = new Set(userAvatars.map(avatar => avatar.avatar_id));
          setOwnedAvatars(ownedIds);
        }
      } catch (err) {
        console.error("Fehler beim Laden der Avatare:", err);
      } finally {
        setLoading(false);
      }
    }
    
    loadAvatars();
  }, [user.id]);

  const categories = Array.from(
    new Set(shopAvatars.map((a) => a.category))
  ).sort();
  
  // Avatare filtern nach ausgewählter Kategorie
  let filteredAvatars = selectedCategory 
    ? shopAvatars.filter((a) => a.category === selectedCategory)
    : [];
    
  // Fallback: Wenn keine gefilterten Avatare gefunden wurden, zeige die ersten 10
  if (filteredAvatars.length === 0 && shopAvatars.length > 0 && selectedCategory) {
    filteredAvatars = shopAvatars.slice(0, 10);
  }
  
  // Sortiere die Avatare
  filteredAvatars = filteredAvatars.sort((a, b) => {
    if (sortOption === "name") {
      // Sichere Behandlung von null-Werten
      const titleA = a.title || '';
      const titleB = b.title || '';
      return titleA.localeCompare(titleB);
    } else {
      return a.price - b.price;
    }
  });

  const hasEnoughCoins = (coins: number | null | undefined, price: number): boolean => {
    return coins !== null && coins !== undefined && coins >= price;
  };

  async function handleBuyOrSelect(avatar: ShopAvatar) {
    if (animating) return;
    
    setAnimating(true);
    
    if (!userStats?.total_coins) {
      setNotification({
        message: "Keine User-Stats verfügbar!",
        type: "error",
      });
      setAnimating(false);
      return;
    }
    
    const isOwned = ownedAvatars.has(avatar.id);
    if (isOwned) {
      // Avatar aktivieren
      const { data, error } = await shopService.activateAvatar(user.id, avatar.id);
      
      if (error) {
        setNotification({
          message: "Fehler beim Setzen des Avatars: " + error.message,
          type: "error",
        });
      } else if (data?.success) {
        setRoundCoins(userStats.total_coins);
        setNotification({
          message: "Avatar erfolgreich ausgewählt!",
          type: "success",
        });
      }
      
      setAnimating(false);
      return;
    }
    
    if (!hasEnoughCoins(userStats.total_coins, avatar.price)) {
      setNotification({ message: "Nicht genügend Münzen!", type: "error" });
      setAnimating(false);
      return;
    }
    
    const ok = window.confirm(
      `"${avatar.title}" für ${avatar.price} Münzen kaufen?`
    );
    
    if (!ok) {
      setAnimating(false);
      return;
    }
    
    // Avatar kaufen
    const { data, error } = await shopService.buyAvatar(user.id, avatar.id);
    
    if (error) {
      setNotification({
        message: "Fehler beim Kauf des Avatars: " + error.message,
        type: "error",
      });
      setAnimating(false);
      return;
    }
    
    if (data?.success && data.userStats) {
      // Aktualisiere die lokalen States
      setOwnedAvatars(new Set([...ownedAvatars, avatar.id]));
      if (data.userStats.total_coins !== null) {
        setRoundCoins(data.userStats.total_coins);
      }
      
      // Aktualisiere die User-Stats
      await fetchUserStats(user.id);
      
      setNotification({
        message: "Avatar erfolgreich gekauft!",
        type: "success",
      });
    } else {
      setNotification({
        message: "Avatar konnte nicht gekauft werden.",
        type: "error",
      });
    }
    
    setAnimating(false);
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  if (loading) {
    return (
      <motion.div 
        className="border-2 border-gray-900 min-h-[600px] flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <motion.div 
          className="flex flex-col items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            className="w-16 h-16 border-4 border-yellow-400 border-t-transparent rounded-full mb-4"
          />
          <p className="text-white text-xl">Shop wird geladen...</p>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      className="min-h-screen bg-[#151923] flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {notification && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`absolute top-4 right-4 p-3 rounded-lg z-50 ${
            notification.type === "success" ? "bg-green-600" : "bg-red-600"
          } text-white`}
        >
          {notification.message}
        </motion.div>
      )}
      
      {/* Header */}
      <div className="bg-[#10131c] text-white p-4 flex justify-between items-center shadow-md">
        <button
          onClick={onClose}
          className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition duration-300 flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          Zurück
        </button>
        <h1 className="text-2xl font-bold">Avatar-Shop</h1>
        <div style={{ width: '80px' }}></div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 overflow-y-auto">
        {/* Kategorien */}
        <motion.div 
          className="bg-[#202431] rounded-lg shadow-md p-4 mb-4"
          variants={itemVariants}
          transition={{ delay: 0.1 }}
          style={{ border: '1px solid #2d3748' }}
        >
          <h3 className="text-lg font-semibold text-white mb-4 text-center pb-2 border-b border-gray-700">
            Kategorien
          </h3>
          
          <ul className="space-y-2">
            {categories.map((category) => (
              <li
                key={category}
                className={`px-4 py-2 rounded-md cursor-pointer transition-colors duration-200 
                  ${selectedCategory === category 
                    ? 'bg-blue-900 text-white font-medium' 
                    : 'text-gray-300 hover:bg-gray-800'}`}
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </li>
            ))}
          </ul>
          
          <div className="mt-4 pt-4 border-t border-gray-700">
            <label className="block text-gray-300 font-medium mb-2">
              Sortieren nach:
            </label>
            <select
              className="w-full p-2 bg-[#1a202c] border border-gray-700 rounded-md text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as any)}
            >
              <option value="name">Name</option>
              <option value="price">Preis</option>
            </select>
          </div>
          
          <div className="mt-4 p-3 bg-[#2d3748] border border-yellow-800 rounded-md">
            <p className="text-white font-medium flex items-center gap-2">
              <span>Deine Münzen:</span>
              <span className="text-yellow-400 font-bold">{userStats?.total_coins ?? 0}</span>
              <span className="text-yellow-400 text-lg">🪙</span>
            </p>
          </div>
        </motion.div>

        {/* Avatar Grid */}
        <motion.div 
          className="bg-[#202431] p-4 rounded-lg shadow-lg"
          variants={itemVariants}
          transition={{ delay: 0.4 }}
          style={{ border: '2px solid #2d3748' }}
        >
          {!selectedCategory ? (
            <motion.p 
              className="text-center text-white py-12 font-bold"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              Lade Kategorien...
            </motion.p>
          ) : filteredAvatars.length === 0 ? (
            <motion.p 
              className="text-center text-white py-12 font-bold"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              Keine Avatare in der Kategorie "{selectedCategory}" verfügbar.
            </motion.p>
          ) : (
            <motion.div 
              className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              {filteredAvatars.map((avatar, index) => {
                const isOwned = ownedAvatars.has(avatar.id);
                
                return (
                  <motion.div
                    key={avatar.id}
                    className="bg-[#2d3748] rounded-lg overflow-hidden shadow-md border border-gray-700 flex flex-col"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 * index }}
                    whileHover={{ scale: 1.03, boxShadow: "0 8px 15px rgba(0, 0, 0, 0.3)" }}
                  >
                    <div className="relative p-2" style={{ minHeight: '160px', background: '#202431' }}>
                      <motion.img
                        className="w-full h-32 md:h-40 object-contain rounded-lg shop-avatar-image"
                        style={{ 
                          display: 'block', 
                          background: '#1a202c', 
                          border: '1px solid #4a5568',
                          padding: '4px'
                        }}
                        src={avatar.image_url}
                        alt={avatar.title?.toString() || ''}
                        initial={{ scale: 0.9, opacity: 0.8 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.3 }}
                        onError={(e) => {
                          e.currentTarget.src = "https://lqoulygftdjbnfxkrihy.supabase.co/storage/v1/object/public/quiz-assets/Logo.svg";
                        }}
                      />
                      
                      <div className="absolute bottom-0 left-0 right-0 bg-blue-900 text-white text-xs md:text-sm p-1 text-center font-bold truncate">
                        {avatar.title}
                      </div>
                      
                      {isOwned && (
                        <motion.div 
                          className="absolute top-2 right-2 bg-green-600 text-white text-xs px-2 py-1 rounded-full"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 300, damping: 15 }}
                        >
                          Besitzt
                        </motion.div>
                      )}
                    </div>
                    
                    <div className="p-3 flex-grow flex flex-col bg-[#1e293b]">
                      <div className="mt-1 flex items-center justify-center">
                        <span className="text-base md:text-lg font-bold text-yellow-400">{avatar.price}</span>
                        <span className="text-yellow-400 text-base md:text-lg ml-2">🪙</span>
                      </div>
                    </div>
                    
                    <div className="p-2 bg-[#2d3748] border-t border-gray-700">
                      <motion.button
                        className={`w-full py-2 rounded-lg text-sm md:text-base font-medium ${
                          isOwned
                            ? "bg-blue-600 hover:bg-blue-700 text-white"
                            : hasEnoughCoins(userStats?.total_coins, avatar.price)
                            ? "bg-green-600 hover:bg-green-700 text-white"
                            : "bg-gray-700 text-gray-400 cursor-not-allowed"
                        }`}
                        onClick={() => handleBuyOrSelect(avatar)}
                        disabled={!isOwned && !hasEnoughCoins(userStats?.total_coins, avatar.price)}
                        whileHover={{ scale: isOwned || hasEnoughCoins(userStats?.total_coins, avatar.price) ? 1.05 : 1 }}
                        whileTap={{ scale: isOwned || hasEnoughCoins(userStats?.total_coins, avatar.price) ? 0.95 : 1 }}
                      >
                        {isOwned ? "Auswählen" : hasEnoughCoins(userStats?.total_coins, avatar.price) ? "Kaufen" : "Nicht genug Münzen"}
                      </motion.button>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}

export default ShopScreen;
