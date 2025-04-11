import { create } from 'zustand';
import type { QuizEvent } from '../../types/quiz';

interface QuizEventBus {
  events: QuizEvent[];
  subscribe: (callback: (event: QuizEvent) => void) => () => void;
  publish: (event: QuizEvent) => void;
  clear: () => void;
}

const useQuizEventBus = create<QuizEventBus>((set) => {
  let subscribers: ((event: QuizEvent) => void)[] = [];

  return {
    events: [],

    subscribe: (callback) => {
      subscribers.push(callback);
      return () => {
        subscribers = subscribers.filter(sub => sub !== callback);
      };
    },

    publish: (event) => {
      set((state) => ({ events: [...state.events, event] }));
      subscribers.forEach(sub => sub(event));
    },

    clear: () => {
      set({ events: [] });
    }
  };
});

export default useQuizEventBus; 