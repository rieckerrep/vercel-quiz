import { create } from 'zustand';

export type QuizEvent = 
  | { type: 'ANSWER_SUBMITTED'; payload: { question_id: number; user_id: string; is_correct: boolean; answered_at: string } }
  | { type: 'SUB_ANSWER_SUBMITTED'; payload: { subQuestionId: number; isCorrect: boolean; timestamp: string } }
  | { type: 'QUIZ_COMPLETED'; payload: { userId: string; chapterId: number; timestamp: string } }
  | { type: 'PROGRESS_UPDATED'; payload: { currentIndex: number; totalQuestions: number; correctAnswers: number; wrongAnswers: number; streak: number; maxStreak: number } }
  | { type: 'REWARDS_UPDATED'; payload: { xp: number; coins: number; possibleXp: number; showAnimation: boolean; isAnimationPlaying: boolean } }
  | { type: 'ANIMATION_STARTED'; payload: { showReward: boolean; showLevelUp: boolean; isPlaying: boolean } }
  | { type: 'ANIMATION_ENDED' };

interface QuizEventBus {
  listeners: Map<QuizEvent['type'], Set<(event: QuizEvent) => void>>;
  emit: (event: QuizEvent) => void;
  on: (type: QuizEvent['type'], callback: (event: QuizEvent) => void) => void;
  off: (type: QuizEvent['type'], callback: (event: QuizEvent) => void) => void;
}

export const useQuizEventBus = create<QuizEventBus>((set, get) => ({
  listeners: new Map(),

  emit: (event) => {
    const listeners = get().listeners.get(event.type);
    if (listeners) {
      listeners.forEach(listener => listener(event));
    }
  },

  on: (type, callback) => {
    const listeners = get().listeners;
    if (!listeners.has(type)) {
      listeners.set(type, new Set());
    }
    listeners.get(type)?.add(callback);
    set({ listeners });
  },

  off: (type, callback) => {
    const listeners = get().listeners;
    listeners.get(type)?.delete(callback);
    set({ listeners });
  }
})); 