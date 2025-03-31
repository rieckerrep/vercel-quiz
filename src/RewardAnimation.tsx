import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import correctSound from './assets/sounds/correct.mp3';
import wrongSound from './assets/sounds/wrong.mp3';

interface RewardAnimationProps {
  xp: number;
  coins: number;
  isCorrect: boolean;
  isVisible: boolean;
  position?: "headline" | "default";
}

const RewardAnimation: React.FC<RewardAnimationProps> = ({ xp, coins, isCorrect, isVisible, position = "default" }) => {
  const [particles, setParticles] = useState<Array<{ id: number, x: number, y: number, size: number, color: string }>>([]);
  const correctAudioRef = useRef<HTMLAudioElement | null>(null);
  const wrongAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    correctAudioRef.current = new Audio(correctSound);
    wrongAudioRef.current = new Audio(wrongSound);

    return () => {
      if (correctAudioRef.current) {
        correctAudioRef.current.pause();
        correctAudioRef.current = null;
      }
      if (wrongAudioRef.current) {
        wrongAudioRef.current.pause();
        wrongAudioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    // Wenn die Animation sichtbar wird
    if (isVisible) {
      if (isCorrect) {
        // Sound für richtige Antwort abspielen
        if (correctAudioRef.current) {
          correctAudioRef.current.currentTime = 0;
          correctAudioRef.current.play()
            .catch(e => console.error("Correct Sound konnte nicht abgespielt werden:", e));
        }
        
        // Partikel erstellen
        const newParticles: Array<{ id: number, x: number, y: number, size: number, color: string }> = [];
        const colors = ['#FFD700', '#FFC107', '#FFEB3B', '#FFFFFF']; // Gold, Gelb, Hell-Gelb, Weiß
        
        for (let i = 0; i < 20; i++) {
          newParticles.push({
            id: i,
            x: Math.random() * 60 - 30, // Kleinerer Bereich für kompaktere Animation
            y: Math.random() * 60 - 30,
            size: Math.random() * 6 + 3, // Etwas kleinere Partikel
            color: colors[Math.floor(Math.random() * colors.length)]
          });
        }
        
        setParticles(newParticles);
      } 
      // Wenn die Antwort falsch ist
      else {
        // Sound für falsche Antwort abspielen
        if (wrongAudioRef.current) {
          wrongAudioRef.current.currentTime = 0;
          wrongAudioRef.current.play()
            .catch(e => console.error("Wrong Sound konnte nicht abgespielt werden:", e));
        }
        
        // Keine Partikel für falsche Antworten
        setParticles([]);
      }
    } 
    // Wenn die Animation ausgeblendet wird
    else {
      setParticles([]);
    }
  }, [isVisible, isCorrect]);

  // Bestimme die Positionsklasse basierend auf der Position-Prop
  // Position anpassen:
  // - Nach oben/unten: Ändere 'top-11' 
  //   - Für höher: Kleinere Zahl, z.B. top-8
  //   - Für tiefer: Größere Zahl, z.B. top-14
  // - Nach links/rechts: Ändere 'left-[660px]'
  //   - Für weiter links: Kleinere Zahl, z.B. left-[600px]
  //   - Für weiter rechts: Größere Zahl, z.B. left-[700px]
  const positionClass = position === "headline" 
    ? "absolute top-12 left-[660px] z-50" // Position weiter links
    : "fixed top-24 right-24 z-50"; // Standard-Position

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className={`pointer-events-none flex items-center justify-center ${positionClass}`}
          style={{ width: '120px', height: '40px' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Partikeleffekt (nur bei richtiger Antwort) */}
          {isCorrect && particles.map(particle => (
            <motion.div
              key={particle.id}
              className="absolute rounded-full"
              style={{
                backgroundColor: particle.color,
                width: particle.size,
                height: particle.size,
              }}
              initial={{ 
                x: 0, 
                y: 0,
                scale: 0,
                opacity: 1
              }}
              animate={{ 
                x: particle.x, 
                y: particle.y,
                scale: 1,
                opacity: 0
              }}
              transition={{ 
                duration: 0.8 + Math.random() * 0.4,
                ease: "easeOut" 
              }}
            />
          ))}

          {/* Belohnungen nebeneinander statt übereinander - nur bei richtigen Antworten */}
          {isCorrect && (
            <div className="flex items-center gap-3">
              {/* XP Belohnung */}
              {xp > 0 && (
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1.2, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  transition={{ duration: 0.8, ease: "backOut" }}
                >
                  <div className="flex items-center justify-center text-xl font-bold text-yellow-400">
                    <span className="mr-1">+{xp}</span>
                    <span>⭐</span>
                  </div>
                </motion.div>
              )}

              {/* Münzen Belohnung */}
              {coins > 0 && (
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1.2, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  transition={{ duration: 0.8, delay: 0.1, ease: "backOut" }}
                >
                  <div className="flex items-center justify-center text-xl font-bold text-yellow-500">
                    <span className="mr-1">+{coins}</span>
                    <span>🪙</span>
                  </div>
                </motion.div>
              )}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default RewardAnimation; 