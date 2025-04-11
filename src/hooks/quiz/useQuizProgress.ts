import { create } from 'zustand';
import { useEffect } from 'react';
import useQuizEventBus from './quizEventBus';
import type { QuizProgress } from '../../types/quiz';

interface QuizProgressState extends QuizProgress {
  // Aktionen
  setProgress: (progress: number) => void;
  incrementCorrectAnswers: () => void;
  incrementWrongAnswers: () => void;
  updateStreak: (isCorrect: boolean) => void;
  resetProgress: () => void;
  calculateProgress: (currentIndex: number, totalQuestions: number) => number;
}

export const useQuizProgress = create<QuizProgressState>((set) => ({
  // Initialer Zustand
  currentIndex: 0,
  totalQuestions: 0,
  correctAnswers: 0,
  wrongAnswers: 0,
  streak: 0,
  maxStreak: 0,

  // Setter
  setProgress: (currentIndex) => 
    set((state) => ({ 
      currentIndex,
      progress: state.calculateProgress(currentIndex, state.totalQuestions)
    })),
  
  incrementCorrectAnswers: () => 
    set((state) => ({ 
      correctAnswers: state.correctAnswers + 1 
    })),
  
  incrementWrongAnswers: () => 
    set((state) => ({ 
      wrongAnswers: state.wrongAnswers + 1 
    })),
  
  updateStreak: (isCorrect) => 
    set((state) => {
      if (isCorrect) {
        const newStreak = state.streak + 1;
        return {
          streak: newStreak,
          maxStreak: Math.max(state.maxStreak, newStreak)
        };
      }
      return { streak: 0 };
    }),
  
  resetProgress: () => 
    set({
      currentIndex: 0,
      totalQuestions: 0,
      correctAnswers: 0,
      wrongAnswers: 0,
      streak: 0,
      maxStreak: 0
    }),
  
  calculateProgress: (currentIndex, totalQuestions) => {
    if (totalQuestions === 0) return 0;
    return Math.round((currentIndex / totalQuestions) * 100);
  }
}));

// Hook für die Event-Verarbeitung
export const useQuizProgressEvents = () => {
  const eventBus = useQuizEventBus();
  const { incrementCorrectAnswers, incrementWrongAnswers, updateStreak } = useQuizProgress();

  useEffect(() => {
    const unsubscribe = eventBus.subscribe((event) => {
      switch (event.type) {
        case 'ANSWER_SUBMITTED':
          if (event.payload.is_correct) {
            incrementCorrectAnswers();
            updateStreak(true);
          } else {
            incrementWrongAnswers();
            updateStreak(false);
          }
          break;

        case 'SUB_ANSWER_SUBMITTED':
          if (event.payload.isCorrect) {
            incrementCorrectAnswers();
            updateStreak(true);
          } else {
            incrementWrongAnswers();
            updateStreak(false);
          }
          break;
      }
    });

    return () => {
      unsubscribe();
    };
  }, [eventBus, incrementCorrectAnswers, incrementWrongAnswers, updateStreak]);
}; 