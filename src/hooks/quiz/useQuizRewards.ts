import { create } from 'zustand';

interface QuizRewards {
  // Belohnungen
  roundXp: number;
  roundCoins: number;
  possibleRoundXp: number;
  showRewardAnimation: boolean;
  rewardXp: number;
  rewardCoins: number;
  isAnimationPlaying: boolean;
  
  // Aktionen
  setRoundXp: (xp: number) => void;
  setRoundCoins: (coins: number) => void;
  setPossibleRoundXp: (xp: number) => void;
  setShowRewardAnimation: (show: boolean) => void;
  setRewardXp: (xp: number) => void;
  setRewardCoins: (coins: number) => void;
  setIsAnimationPlaying: (playing: boolean) => void;
  
  // Belohnungsfunktionen
  awardQuestion: (isCorrect: boolean) => void;
  awardSubquestion: (isCorrect: boolean) => void;
  computeXp: (isCorrect: boolean, streak: number) => number;
  computePossibleXp: (totalQuestions: number) => number;
  resetRewards: () => void;
}

export const useQuizRewards = create<QuizRewards>((set) => ({
  // Initialer Zustand
  roundXp: 0,
  roundCoins: 0,
  possibleRoundXp: 0,
  showRewardAnimation: false,
  rewardXp: 0,
  rewardCoins: 0,
  isAnimationPlaying: false,

  // Setter
  setRoundXp: (xp) => set({ roundXp: xp }),
  setRoundCoins: (coins) => set({ roundCoins: coins }),
  setPossibleRoundXp: (xp) => set({ possibleRoundXp: xp }),
  setShowRewardAnimation: (show) => set({ showRewardAnimation: show }),
  setRewardXp: (xp) => set({ rewardXp: xp }),
  setRewardCoins: (coins) => set({ rewardCoins: coins }),
  setIsAnimationPlaying: (playing) => set({ isAnimationPlaying: playing }),

  // Belohnungsfunktionen
  awardQuestion: (isCorrect) => {
    const xp = isCorrect ? 10 : 0;
    const coins = isCorrect ? 10 : -5;
    
    set((state) => ({
      roundXp: state.roundXp + xp,
      roundCoins: state.roundCoins + coins,
      rewardXp: xp,
      rewardCoins: coins,
      showRewardAnimation: true,
      isAnimationPlaying: true
    }));
  },

  awardSubquestion: (isCorrect) => {
    const xp = isCorrect ? 5 : 0;
    const coins = isCorrect ? 5 : -2;
    
    set((state) => ({
      roundXp: state.roundXp + xp,
      roundCoins: state.roundCoins + coins,
      rewardXp: xp,
      rewardCoins: coins,
      showRewardAnimation: true,
      isAnimationPlaying: true
    }));
  },

  computeXp: (isCorrect, streak) => {
    const baseXp = isCorrect ? 10 : 0;
    const streakBonus = isCorrect ? Math.min(streak, 5) * 2 : 0;
    return baseXp + streakBonus;
  },

  computePossibleXp: (totalQuestions) => {
    // Basis-XP pro Frage: 10
    // Zusätzliche XP für Unterfragen: 5 pro Unterfrage
    return totalQuestions * 10;
  },

  resetRewards: () => {
    set({
      roundXp: 0,
      roundCoins: 0,
      possibleRoundXp: 0,
      showRewardAnimation: false,
      rewardXp: 0,
      rewardCoins: 0,
      isAnimationPlaying: false
    });
  }
})); 