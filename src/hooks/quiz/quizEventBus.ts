import { create } from 'zustand';
import { QuizAnswerInsert, QuizProgress, QuizRewards, QuizAnimations } from '../../types/quiz';

export type QuizEvent = 
  | { type: 'ANSWER_SUBMITTED'; payload: QuizAnswerInsert }
  | { type: 'SUB_ANSWER_SUBMITTED'; payload: { subQuestionId: number; isCorrect: boolean; timestamp: string } }
  | { type: 'QUIZ_COMPLETED'; payload: { userId: string; chapterId: number; timestamp: string } }
  | { type: 'PROGRESS_UPDATED'; payload: QuizProgress }
  | { type: 'REWARDS_UPDATED'; payload: QuizRewards }
  | { type: 'ANIMATION_STARTED'; payload: QuizAnimations }
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