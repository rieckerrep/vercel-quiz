import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import "./ShopScreen.css";
import { supabase } from "./supabaseClient";

interface ShopAvatar {
  id: number;
  title: string;
  category: string;
  image_url: string;
  price: number;
  active: boolean;
}

interface ShopScreenProps {
  userId: string;
  profile: {
    username: string;
    avatar_url: string;
    id: string;
  };
  userStats: {
    total_xp: number;
    total_coins: number;
  };
  onBack: () => void;
  updateUserStats: (updates: { total_xp: number; total_coins: number }) => void;
  updateActiveAvatar: (avatarUrl: string) => void;
}

export function ShopScreen({
  onBack,
  userId,
  userStats,
  updateUserStats,
  updateActiveAvatar,
}: ShopScreenProps) {
  const [shopAvatars, setShopAvatars] = useState<ShopAvatar[]>([]);
  const [ownedAvatars, setOwnedAvatars] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [sortOption, setSortOption] = useState<"name" | "price">("name");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    message: string;
    type: "error" | "success";
  } | null>(null);
  const [animating, setAnimating] = useState(false);
  
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

  useEffect(() => {
    (async () => {
      setLoading(true);
      
      // Avatare von der Datenbank laden
      const { data, error } = await supabase
        .from("shop_avatars")
        .select("id, title, category, image_url, price, active")
        .eq("active", true);
        
      if (error) {
        // Fehler beim Laden - leise behandeln
        setLoading(false);
        return;
      } 
      
      if (data && data.length > 0) {
        // Nur URL-Format korrigieren, nicht den Pfad ändern
        const processedData = data.map(avatar => ({
          ...avatar,
          image_url: fixImageUrl(avatar.image_url)
        }));
        
        setShopAvatars(processedData);
        
        // Setze die erste verfügbare Kategorie als ausgewählte Kategorie
        const categories = Array.from(new Set(processedData.map(a => a.category))).sort();
        if (categories.length > 0 && !selectedCategory) {
          setSelectedCategory(categories[0]);
        }
      }
      
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data, error } = await supabase
        .from("user_avatars")
        .select("avatar_id")
        .eq("user_id", userId);
      if (!error && data) {
        const owned = new Set<number>();
        data.forEach((row: any) => {
          owned.add(row.avatar_id);
        });
        setOwnedAvatars(owned);
      }
    })();
  }, [userId]);

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
      return a.title.localeCompare(b.title);
    } else {
      return a.price - b.price;
    }
  });

  async function handleBuyOrSelect(avatar: ShopAvatar) {
    if (animating) return;
    
    setAnimating(true);
    
    if (!userStats) {
      setNotification({
        message: "Keine User-Stats verfügbar!",
        type: "error",
      });
      setAnimating(false);
      return;
    }
    
    const isOwned = ownedAvatars.has(avatar.id);
    if (isOwned) {
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: avatar.image_url })
        .eq("id", userId);
      if (error) {
        setNotification({
          message: "Fehler beim Setzen des Avatars.",
          type: "error",
        });
      } else {
        updateActiveAvatar(avatar.image_url);
        setNotification({
          message: "Avatar erfolgreich ausgewählt!",
          type: "success",
        });
      }
      setAnimating(false);
      return;
    }
    
    if (userStats.total_coins < avatar.price) {
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
    
    const newCoins = userStats.total_coins - avatar.price;
    const { error: updateError } = await supabase
      .from("user_stats")
      .update({ total_coins: newCoins })
      .eq("user_id", userId);
      
    if (updateError) {
      setNotification({
        message: "Fehler beim Aktualisieren der Münzen.",
        type: "error",
      });
      setAnimating(false);
      return;
    }
    
    const { error: insertError } = await supabase
      .from("user_avatars")
      .insert([{ user_id: userId, avatar_id: avatar.id }]);
      
    if (insertError) {
      setNotification({
        message: "Fehler beim Kauf des Avatars.",
        type: "error",
      });
      setAnimating(false);
      return;
    }
    
    setOwnedAvatars((prev) => new Set(prev).add(avatar.id));
    updateUserStats({
      total_xp: userStats.total_xp,
      total_coins: newCoins,
    });
    
    setNotification({
      message: "Avatar erfolgreich gekauft!",
      type: "success",
    });
    
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
      className="border-2 border-gray-900 min-h-[600px] max-h-[600px] overflow-hidden relative"
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
      
      <div className="flex flex-col h-full w-full">
        <div className="bg-[#10131c] text-white p-4 flex justify-between items-center shadow-md w-full">
          <button
            onClick={onBack}
            className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition duration-300 flex items-center gap-2"
          >
            Zurück
          </button>
          <h1 className="text-2xl font-bold">Avatar-Shop</h1>
          <div style={{ width: '80px' }}></div> {/* Platzhalter für Ausrichtung */}
        </div>

        <div className="flex-1 flex flex-col p-4 bg-[#151923] overflow-auto w-full" style={{ height: 'calc(600px - 64px)' }}>
          <div className="flex flex-col md:flex-row gap-4 flex-1 h-full">
            {/* Sidebar */}
            <motion.div 
              className="md:w-1/4 bg-[#202431] rounded-lg shadow-md p-4 md:max-h-[calc(600px-120px)] overflow-y-auto"
              variants={itemVariants}
              transition={{ delay: 0.1 }}
              style={{ 
                border: '1px solid #2d3748',
                maxHeight: 'calc(600px - 120px)'
              }}
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
              
              <div className="mt-6 pt-4 border-t border-gray-700">
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
              
              <div className="mt-6 p-3 bg-[#2d3748] border border-yellow-800 rounded-md">
                <p className="text-white font-medium flex items-center gap-2">
                  <span>Deine Münzen:</span>
                  <span className="text-yellow-400 font-bold">{userStats ? userStats.total_coins : 0}</span>
                  <span className="text-yellow-400 text-lg">🪙</span>
                </p>
              </div>
            </motion.div>

            {/* Avatare */}
            <motion.div 
              className="flex-1 bg-[#202431] p-4 rounded-lg shadow-lg overflow-y-auto"
              variants={itemVariants}
              transition={{ delay: 0.4 }}
              style={{ 
                border: '2px solid #2d3748', 
                minHeight: '400px',
                maxHeight: 'calc(600px - 120px)',
                overflowY: 'auto'
              }}
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
                  className="shop-avatar-grid grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                  style={{ 
                    border: '1px dashed #4a5568', 
                    padding: '16px', 
                    borderRadius: '8px',
                    background: '#1a202c'
                  }}
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
                        <div className="relative p-2" style={{ minHeight: '200px', background: '#202431' }}>
                          <motion.img
                            className="w-full h-40 object-contain rounded-lg shop-avatar-image"
                            style={{ 
                              display: 'block', 
                              background: '#1a202c', 
                              border: '1px solid #4a5568',
                              padding: '4px'
                            }}
                            src={avatar.image_url}
                            alt={avatar.title}
                            initial={{ scale: 0.9, opacity: 0.8 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.3 }}
                            onError={(e) => {
                              // Fallback zum Logo bei Fehler
                              e.currentTarget.src = "https://lqoulygftdjbnfxkrihy.supabase.co/storage/v1/object/public/quiz-assets/Logo.svg";
                            }}
                          />
                          
                          {/* Titel unter dem Bild anzeigen, um zu sehen, welcher Avatar es ist */}
                          <div className="absolute bottom-0 left-0 right-0 bg-blue-900 text-white text-sm p-1 text-center font-bold truncate">
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
                        
                        <div className="p-4 flex-grow flex flex-col bg-[#1e293b]">
                          <h3 className="text-white font-bold mb-1 text-center">{avatar.title}</h3>
                          <div className="mt-2 flex items-center justify-center">
                            <span className="text-lg font-bold text-yellow-400">{avatar.price}</span>
                            <span className="text-yellow-400 text-lg ml-2">🪙</span>
                          </div>
                        </div>
                        
                        <div className="p-3 bg-[#2d3748] border-t border-gray-700">
                          <motion.button
                            className={`w-full py-2 rounded-lg font-medium ${
                              isOwned
                                ? "bg-blue-600 hover:bg-blue-700 text-white"
                                : userStats && userStats.total_coins >= avatar.price
                                ? "bg-green-600 hover:bg-green-700 text-white"
                                : "bg-gray-700 text-gray-400 cursor-not-allowed"
                            }`}
                            onClick={() => handleBuyOrSelect(avatar)}
                            disabled={!isOwned && (!userStats || userStats.total_coins < avatar.price)}
                            whileHover={{ scale: isOwned || (userStats && userStats.total_coins >= avatar.price) ? 1.05 : 1 }}
                            whileTap={{ scale: isOwned || (userStats && userStats.total_coins >= avatar.price) ? 0.95 : 1 }}
                          >
                            {isOwned ? "Auswählen" : userStats && userStats.total_coins >= avatar.price ? "Kaufen" : "Nicht genug Münzen"}
                          </motion.button>
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default ShopScreen;
