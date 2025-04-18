import { create } from 'zustand';
import { supabase } from '@/lib/supabaseClient';

interface QuizRewards {
  // Belohnungen
  roundXp: number;
  roundCoins: number;
  possibleRoundXp: number;
  showRewardAnimation: boolean;
  rewardXp: number;
  rewardCoins: number;
  isAnimationPlaying: boolean;
  isCalculatingXp: boolean;
  
  // Aktionen
  setRoundXp: (xp: number) => void;
  setRoundCoins: (coins: number) => void;
  setPossibleRoundXp: (xp: number) => void;
  setShowRewardAnimation: (show: boolean) => void;
  setRewardXp: (xp: number) => void;
  setRewardCoins: (coins: number) => void;
  setIsAnimationPlaying: (playing: boolean) => void;
  setIsCalculatingXp: (calculating: boolean) => void;
  
  // Belohnungsfunktionen
  awardQuestion: (isCorrect: boolean) => void;
  awardSubquestion: (isCorrect: boolean) => void;
  computeXp: (isCorrect: boolean, streak: number) => number;
  computePossibleXp: (totalQuestions: number, questions: any[]) => Promise<number>;
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
  isCalculatingXp: false,

  // Setter
  setRoundXp: (xp) => set({ roundXp: xp }),
  setRoundCoins: (coins) => set({ roundCoins: coins }),
  setPossibleRoundXp: (xp) => set({ possibleRoundXp: xp }),
  setShowRewardAnimation: (show) => set({ showRewardAnimation: show }),
  setRewardXp: (xp) => set({ rewardXp: xp }),
  setRewardCoins: (coins) => set({ rewardCoins: coins }),
  setIsAnimationPlaying: (playing) => set({ isAnimationPlaying: playing }),
  setIsCalculatingXp: (calculating) => set({ isCalculatingXp: calculating }),

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

  computePossibleXp: async (totalQuestions: number, questions: any[]) => {
    // Wenn bereits eine Berechnung läuft, warte
    if (useQuizRewards.getState().isCalculatingXp) {
      return useQuizRewards.getState().possibleRoundXp;
    }

    // Setze Berechnungsstatus
    set({ isCalculatingXp: true });
    
    try {
      let total = 0;
      
      // Hole bereits beantwortete Fragen
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return 0;

      const { data: answeredQuestions } = await supabase
        .from('answered_questions')
        .select('question_id')
        .eq('user_id', session.user.id);

      const answeredQuestionIds = answeredQuestions?.map(q => q.question_id) || [];
      
      // Berechne für jede Frage die möglichen XP
      for (const q of questions) {
        // Überspringe bereits beantwortete Fragen
        if (answeredQuestionIds.includes(q.id)) continue;

        if (q.type === "cases") {
          const { data: subs, error } = await supabase
            .from("cases_subquestions")
            .select("id")
            .eq("question_id", q.id);
          if (!error && subs) {
            total += subs.length * 5; // 5 XP pro Unterfrage
          }
        }
        total += 10; // Basis-XP pro Frage
      }
      
      // Setze das Ergebnis und beende die Berechnung
      set({ 
        possibleRoundXp: total,
        isCalculatingXp: false 
      });
      
      return total;
    } catch (error) {
      console.error("Fehler bei der Berechnung der möglichen XP:", error);
      set({ isCalculatingXp: false });
      return 0; // Fallback auf 0 XP
    }
  },

  resetRewards: () => {
    set({
      roundXp: 0,
      roundCoins: 0,
      possibleRoundXp: 0,
      showRewardAnimation: false,
      rewardXp: 0,
      rewardCoins: 0,
      isAnimationPlaying: false,
      isCalculatingXp: false
    });
  }
})); 