import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Sound-Effekte importieren
import correctSoundFile from "../assets/sounds/correct.mp3";
import wrongSoundFile from "../assets/sounds/wrong.mp3";

interface SoundState {
  isMuted: boolean;
  volume: number;
  isSoundPlaying: boolean;
  playCorrectSound: () => Promise<void>;
  playWrongSound: () => Promise<void>;
  toggleMute: () => void;
  setVolume: (volume: number) => void;
  setIsSoundPlaying: (playing: boolean) => void;
}

export const useSoundStore = create<SoundState>()(
  persist(
    (set, get) => ({
      isMuted: false,
      volume: 0.5,
      isSoundPlaying: false,
      
      playCorrectSound: async () => {
        try {
          const { isMuted, volume, isSoundPlaying } = get();
          if (isMuted || isSoundPlaying) return;
          
          set({ isSoundPlaying: true });
          const audio = new Audio(correctSoundFile);
          audio.volume = volume;
          await audio.play();
          
          audio.onended = () => {
            set({ isSoundPlaying: false });
          };
        } catch (error) {
          console.warn('Sound konnte nicht abgespielt werden:', error);
          set({ isSoundPlaying: false });
        }
      },
      
      playWrongSound: async () => {
        try {
          const { isMuted, volume, isSoundPlaying } = get();
          if (isMuted || isSoundPlaying) return;
          
          set({ isSoundPlaying: true });
          const audio = new Audio(wrongSoundFile);
          audio.volume = volume;
          await audio.play();
          
          audio.onended = () => {
            set({ isSoundPlaying: false });
          };
        } catch (error) {
          console.warn('Sound konnte nicht abgespielt werden:', error);
          set({ isSoundPlaying: false });
        }
      },
      
      toggleMute: () => {
        set((state) => ({ isMuted: !state.isMuted }));
      },
      
      setVolume: (volume: number) => {
        set({ volume: Math.max(0, Math.min(1, volume)) });
      },

      setIsSoundPlaying: (playing: boolean) => {
        set({ isSoundPlaying: playing });
      }
    }),
    {
      name: 'sound-storage',
    }
  )
) 