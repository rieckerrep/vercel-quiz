import { create } from 'zustand';
import type { QuizQuestion } from '../../types/quiz';

interface QuizState {
  // Quiz-Zustände
  currentQuestion: QuizQuestion | null;
  currentQuestionIndex: number;
  totalQuestions: number;
  isQuizActive: boolean;
  isQuizEnd: boolean;
  isAnswering: boolean;
  isAnswered: boolean;
  isAnswerSubmitted: boolean;
  isCorrect: boolean;
  lastAnswerCorrect: boolean;
  selectedAnswer: string | null;
  userInputAnswer: string;
  showExplanation: boolean;
  showReward: boolean;
  showLevelUp: boolean;
  isAnimating: boolean;
  isLoading: boolean;

  // UI-Zustände
  showNavigation: boolean;
  showJokerPanel: boolean;
  showLeaderboard: boolean;
  subQuestionResults: Record<number, boolean>;

  // Setter-Funktionen
  setCurrentQuestion: (question: QuizQuestion | null) => void;
  setCurrentQuestionIndex: (index: number) => void;
  setTotalQuestions: (total: number) => void;
  setIsQuizActive: (active: boolean) => void;
  setIsQuizEnd: (end: boolean) => void;
  setIsAnswering: (isAnswering: boolean) => void;
  setIsAnswered: (isAnswered: boolean) => void;
  setIsAnswerSubmitted: (submitted: boolean) => void;
  setIsCorrect: (isCorrect: boolean) => void;
  setLastAnswerCorrect: (correct: boolean) => void;
  setSelectedAnswer: (answer: string | null) => void;
  setUserInputAnswer: (answer: string) => void;
  setShowExplanation: (show: boolean) => void;
  setShowReward: (show: boolean) => void;
  setShowLevelUp: (show: boolean) => void;
  setIsAnimating: (isAnimating: boolean) => void;
  setIsLoading: (loading: boolean) => void;

  // UI-Setter
  setShowNavigation: (show: boolean) => void;
  setShowJokerPanel: (show: boolean) => void;
  setShowLeaderboard: (show: boolean) => void;
  setSubQuestionResult: (id: number, isCorrect: boolean) => void;

  // Quiz-Funktionen
  initQuiz: (questions: QuizQuestion[]) => void;
  nextQuestion: () => void;
  previousQuestion: () => void;
  resetQuiz: () => void;
  toggleJokerPanel: () => void;
  toggleLeaderboard: () => void;
  handleTrueFalseAnswer: (questionId: number, isTrue: boolean) => Promise<void>;
  handleSubquestionAnswered: (subId: number, isCorrect: boolean) => Promise<void>;
  finalizeQuiz: () => void;
}

export const useQuizState = create<QuizState>((set) => ({
  // Initialzustände
  currentQuestion: null,
  currentQuestionIndex: 0,
  totalQuestions: 0,
  isQuizActive: false,
  isQuizEnd: false,
  isAnswering: false,
  isAnswered: false,
  isAnswerSubmitted: false,
  isCorrect: false,
  lastAnswerCorrect: false,
  selectedAnswer: null,
  userInputAnswer: "",
  showExplanation: false,
  showReward: false,
  showLevelUp: false,
  isAnimating: false,
  isLoading: false,

  // UI-Initialzustände
  showNavigation: true,
  showJokerPanel: false,
  showLeaderboard: false,
  subQuestionResults: {},

  // Setter-Funktionen
  setCurrentQuestion: (question) => set({ currentQuestion: question }),
  setCurrentQuestionIndex: (index) => set({ currentQuestionIndex: index }),
  setTotalQuestions: (total) => set({ totalQuestions: total }),
  setIsQuizActive: (active) => set({ isQuizActive: active }),
  setIsQuizEnd: (end) => set({ isQuizEnd: end }),
  setIsAnswering: (isAnswering) => set({ isAnswering }),
  setIsAnswered: (isAnswered) => set({ isAnswered }),
  setIsAnswerSubmitted: (submitted) => set({ isAnswerSubmitted: submitted }),
  setIsCorrect: (isCorrect) => set({ isCorrect }),
  setLastAnswerCorrect: (correct) => set({ lastAnswerCorrect: correct }),
  setSelectedAnswer: (answer) => set({ selectedAnswer: answer }),
  setUserInputAnswer: (answer) => set({ userInputAnswer: answer }),
  setShowExplanation: (show) => set({ showExplanation: show }),
  setShowReward: (show) => set({ showReward: show }),
  setShowLevelUp: (show) => set({ showLevelUp: show }),
  setIsAnimating: (isAnimating) => set({ isAnimating }),
  setIsLoading: (loading) => set({ isLoading: loading }),

  // UI-Setter
  setShowNavigation: (show) => set({ showNavigation: show }),
  setShowJokerPanel: (show) => set({ showJokerPanel: show }),
  setShowLeaderboard: (show) => set({ showLeaderboard: show }),
  setSubQuestionResult: (id, isCorrect) => 
    set((state) => ({
      subQuestionResults: {
        ...state.subQuestionResults,
        [id]: isCorrect
      }
    })),

  // Quiz-Funktionen
  initQuiz: (questions) => {
    set({
      currentQuestion: questions[0],
      currentQuestionIndex: 0,
      totalQuestions: questions.length,
      isQuizActive: true,
      isQuizEnd: false,
      isAnswering: false,
      isAnswered: false,
      isAnswerSubmitted: false,
      isCorrect: false,
      lastAnswerCorrect: false,
      selectedAnswer: null,
      userInputAnswer: "",
      showExplanation: false,
      showReward: false,
      showLevelUp: false,
      isAnimating: false,
      isLoading: false,
      showNavigation: true,
      showJokerPanel: false,
      showLeaderboard: false,
      subQuestionResults: {}
    });
  },

  nextQuestion: () => {
    set((state) => {
      const nextIndex = state.currentQuestionIndex + 1;
      const isEnd = nextIndex >= state.totalQuestions;

      return {
        currentQuestionIndex: nextIndex,
        isQuizEnd: isEnd,
        isAnswering: false,
        isAnswered: false,
        isAnswerSubmitted: false,
        isCorrect: false,
        lastAnswerCorrect: false,
        selectedAnswer: null,
        userInputAnswer: "",
        showExplanation: false,
        showReward: false,
        showLevelUp: false,
        isAnimating: false
      };
    });
  },

  previousQuestion: () => {
    set((state) => {
      if (state.currentQuestionIndex > 0) {
        return {
          currentQuestionIndex: state.currentQuestionIndex - 1,
          isAnswering: false,
          isAnswered: false,
          isAnswerSubmitted: false,
          isCorrect: false,
          lastAnswerCorrect: false,
          selectedAnswer: null,
          userInputAnswer: "",
          showExplanation: false,
          showReward: false,
          showLevelUp: false,
          isAnimating: false
        };
      }
      return state;
    });
  },

  resetQuiz: () => {
    set({
      currentQuestion: null,
      currentQuestionIndex: 0,
      totalQuestions: 0,
      isQuizActive: false,
      isQuizEnd: false,
      isAnswering: false,
      isAnswered: false,
      isAnswerSubmitted: false,
      isCorrect: false,
      lastAnswerCorrect: false,
      selectedAnswer: null,
      userInputAnswer: "",
      showExplanation: false,
      showReward: false,
      showLevelUp: false,
      isAnimating: false,
      isLoading: false,
      showNavigation: true,
      showJokerPanel: false,
      showLeaderboard: false,
      subQuestionResults: {}
    });
  },

  toggleJokerPanel: () => {
    set((state) => ({ showJokerPanel: !state.showJokerPanel }));
  },

  toggleLeaderboard: () => {
    set((state) => ({ showLeaderboard: !state.showLeaderboard }));
  },

  handleTrueFalseAnswer: async (questionId: number, isTrue: boolean) => {
    set({ 
      isAnswerSubmitted: true,
      selectedAnswer: isTrue ? 'true' : 'false',
      isCorrect: isTrue // Hier müsste die tatsächliche Korrektheit der Antwort überprüft werden
    });
  },

  handleSubquestionAnswered: async (subId: number, isCorrect: boolean) => {
    set((state) => ({
      subQuestionResults: {
        ...state.subQuestionResults,
        [subId]: isCorrect
      }
    }));
  },

  finalizeQuiz: () => {
    set({ isQuizEnd: true });
  }
})); 