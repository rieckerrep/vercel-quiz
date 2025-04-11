import { create } from 'zustand';
import { useEffect } from 'react';
import { useQuizEventBus, QuizEvent } from './quizEventBus';
import type { QuizProgress } from '../../types/quiz';

interface QuizProgressState extends QuizProgress {
  // Aktionen
  setProgress: (progress: number) => void;
  incrementCorrectAnswers: () => void;
  incrementWrongAnswers: () => void;
  updateStreak: (isCorrect: boolean) => void;
  resetProgress: () => void;
  calculateProgress: (currentIndex: number, totalQuestions: number) => number;
  progress: number;
}

export const useQuizProgress = create<QuizProgressState>((set, get) => ({
  // Initialer Zustand
  currentIndex: 0,
  totalQuestions: 0,
  correctAnswers: 0,
  wrongAnswers: 0,
  streak: 0,
  maxStreak: 0,
  progress: 0,

  // Setter
  setProgress: (currentIndex) => {
    const state = get();
    const progress = state.calculateProgress(currentIndex, state.totalQuestions);
    
    set({ currentIndex, progress });

    // Event emittieren
    useQuizEventBus.getState().emit({
      type: 'PROGRESS_UPDATED',
      payload: {
        currentIndex: state.currentIndex,
        totalQuestions: state.totalQuestions,
        correctAnswers: state.correctAnswers,
        wrongAnswers: state.wrongAnswers,
        streak: state.streak,
        maxStreak: state.maxStreak
      }
    });
  },
  
  incrementCorrectAnswers: () => 
    set((state) => {
      const newState = { correctAnswers: state.correctAnswers + 1 };
      
      // Event emittieren
      useQuizEventBus.getState().emit({
        type: 'PROGRESS_UPDATED',
        payload: {
          currentIndex: state.currentIndex,
          totalQuestions: state.totalQuestions,
          correctAnswers: newState.correctAnswers,
          wrongAnswers: state.wrongAnswers,
          streak: state.streak,
          maxStreak: state.maxStreak
        }
      });
      
      return newState;
    }),
  
  incrementWrongAnswers: () => 
    set((state) => {
      const newState = { wrongAnswers: state.wrongAnswers + 1 };
      
      // Event emittieren
      useQuizEventBus.getState().emit({
        type: 'PROGRESS_UPDATED',
        payload: {
          currentIndex: state.currentIndex,
          totalQuestions: state.totalQuestions,
          correctAnswers: state.correctAnswers,
          wrongAnswers: newState.wrongAnswers,
          streak: state.streak,
          maxStreak: state.maxStreak
        }
      });
      
      return newState;
    }),
  
  updateStreak: (isCorrect) => 
    set((state) => {
      const newState = isCorrect 
        ? {
            streak: state.streak + 1,
            maxStreak: Math.max(state.maxStreak, state.streak + 1)
          }
        : { streak: 0 };
      
      // Event emittieren
      useQuizEventBus.getState().emit({
        type: 'PROGRESS_UPDATED',
        payload: {
          currentIndex: state.currentIndex,
          totalQuestions: state.totalQuestions,
          correctAnswers: state.correctAnswers,
          wrongAnswers: state.wrongAnswers,
          streak: newState.streak,
          maxStreak: newState.maxStreak || state.maxStreak
        }
      });
      
      return newState;
    }),
  
  resetProgress: () => {
    const newState = {
      currentIndex: 0,
      totalQuestions: 0,
      correctAnswers: 0,
      wrongAnswers: 0,
      streak: 0,
      maxStreak: 0
    };
    
    set(newState);
    
    // Event emittieren
    useQuizEventBus.getState().emit({
      type: 'PROGRESS_UPDATED',
      payload: newState
    });
  },
  
  calculateProgress: (currentIndex, totalQuestions) => {
    if (totalQuestions === 0) return 0;
    return Math.round((currentIndex / totalQuestions) * 100);
  }
}));

// Hook für die Event-Verarbeitung
export const useQuizProgressEvents = () => {
  const eventBus = useQuizEventBus.getState();
  const { incrementCorrectAnswers, incrementWrongAnswers, updateStreak } = useQuizProgress();

  useEffect(() => {
    const handleEvent = (event: QuizEvent) => {
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
    };

    eventBus.on('ANSWER_SUBMITTED', handleEvent);
    eventBus.on('SUB_ANSWER_SUBMITTED', handleEvent);

    return () => {
      eventBus.off('ANSWER_SUBMITTED', handleEvent);
      eventBus.off('SUB_ANSWER_SUBMITTED', handleEvent);
    };
  }, [eventBus, incrementCorrectAnswers, incrementWrongAnswers, updateStreak]);
}; 