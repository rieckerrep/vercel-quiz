import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Sound-Effekte importieren
import correctSoundFile from "../assets/sounds/correct.mp3";
import wrongSoundFile from "../assets/sounds/wrong.mp3";

interface SoundState {
  isMuted: boolean;
  volume: number;
  playCorrectSound: () => Promise<void>;
  playWrongSound: () => Promise<void>;
  toggleMute: () => void;
  setVolume: (volume: number) => void;
}

export const useSoundStore = create<SoundState>()(
  persist(
    (set, get) => ({
      isMuted: false,
      volume: 0.5,
      
      playCorrectSound: async () => {
        try {
          const { isMuted, volume } = get();
          if (isMuted) return;
          
          const audio = new Audio(correctSoundFile);
          audio.volume = volume;
          await audio.play();
        } catch (error) {
          console.warn('Sound konnte nicht abgespielt werden:', error);
        }
      },
      
      playWrongSound: async () => {
        try {
          const { isMuted, volume } = get();
          if (isMuted) return;
          
          const audio = new Audio(wrongSoundFile);
          audio.volume = volume;
          await audio.play();
        } catch (error) {
          console.warn('Sound konnte nicht abgespielt werden:', error);
        }
      },
      
      toggleMute: () => {
        set((state) => ({ isMuted: !state.isMuted }));
      },
      
      setVolume: (volume: number) => {
        set({ volume: Math.max(0, Math.min(1, volume)) });
      },
    }),
    {
      name: 'sound-storage',
    }
  )
) 