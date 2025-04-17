import { create } from 'zustand';
import correctSound from '../../assets/sounds/correct.mp3';
import wrongSound from '../../assets/sounds/wrong.mp3';

interface QuizAnimations {
  // Animation-Status
  showRewardAnimation: boolean;
  showLevelUpAnimation: boolean;
  isAnimationPlaying: boolean;
  
  // Aktionen
  setShowRewardAnimation: (show: boolean) => void;
  setShowLevelUpAnimation: (show: boolean) => void;
  setIsAnimationPlaying: (playing: boolean) => void;
  
  // Sound-Funktionen
  playCorrectSound: () => Promise<void>;
  playWrongSound: () => Promise<void>;
  
  // Animation-Funktionen
  showRewardAnimationWithSound: (isCorrect: boolean) => Promise<void>;
  hideRewardAnimation: () => void;
  showLevelUpAnimationWithSound: () => Promise<void>;
  hideLevelUpAnimation: () => void;
  resetAnimations: () => void;
}

export const useQuizAnimations = create<QuizAnimations>((set) => ({
  // Initialer Zustand
  showRewardAnimation: false,
  showLevelUpAnimation: false,
  isAnimationPlaying: false,

  // Setter
  setShowRewardAnimation: (show) => set({ showRewardAnimation: show }),
  setShowLevelUpAnimation: (show) => set({ showLevelUpAnimation: show }),
  setIsAnimationPlaying: (playing) => set({ isAnimationPlaying: playing }),

  // Sound-Funktionen
  playCorrectSound: async () => {
    const audio = new Audio(correctSound);
    await audio.play();
  },

  playWrongSound: async () => {
    const audio = new Audio(wrongSound);
    await audio.play();
  },

  // Animation-Funktionen
  showRewardAnimationWithSound: async (isCorrect) => {
    set({ isAnimationPlaying: true, showRewardAnimation: true });
    if (isCorrect) {
      await new Audio(correctSound).play();
    } else {
      await new Audio(wrongSound).play();
    }
  },

  hideRewardAnimation: () => {
    set({ showRewardAnimation: false, isAnimationPlaying: false });
  },

  showLevelUpAnimationWithSound: async () => {
    set({ isAnimationPlaying: true, showLevelUpAnimation: true });
    await new Audio(correctSound).play();
  },

  hideLevelUpAnimation: () => {
    set({ showLevelUpAnimation: false, isAnimationPlaying: false });
  },

  resetAnimations: () => {
    set({
      showRewardAnimation: false,
      showLevelUpAnimation: false,
      isAnimationPlaying: false
    });
  }
})); 