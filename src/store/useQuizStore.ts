import { create } from 'zustand'
import { Database } from '../types/supabase'
import { supabase } from '../lib/supabaseClient'
import useUserStore from './useUserStore'
import correctSound from '../assets/sounds/correct.mp3'
import wrongSound from '../assets/sounds/wrong.mp3'
import { useSoundStore } from './useSoundStore'
import { quizService } from '../api/quizService'
import { userService } from '../api/userService'
import { authService } from '../api/authService'
import { 
  AnsweredSubQuestion, 
  QuizEvent, 
  QuestionType, 
  QuestionOption,
  QuizAnswer,
  QuizSubAnswer,
  QuizProgress,
  QuizRewards,
  QuizAnimations
} from '../types/quiz'
import { useQuizEventBus } from '../hooks/quiz/quizEventBus'

export interface Question {
  id: number;
  type: string;
  question_text: string;
  correct_answer: string;
  explanation: string | null;
  chapter_id?: number;
  // Alte Eigenschaftsnamen für Abwärtskompatibilität
  Frage?: string | null;
  Begründung?: string | null;
  "Richtige Antwort"?: string | null;
  "Antwort A"?: string | null;
  "Antwort B"?: string | null;
  "Antwort C"?: string | null;
  "Antwort D"?: string | null;
  sub_questions?: Array<{
    id: number;
    statement_text: string;
    correct_answer: string;
    explanation: string | null;
    // Alte Eigenschaftsnamen für Abwärtskompatibilität
    Frage?: string | null;
    Begründung?: string | null;
    "Richtige Antwort"?: string | null;
  }>;
}

type UserStats = Database['public']['Tables']['user_stats']['Row']

interface QuizState {
  // Fragen-Management
  questions: Question[];
  isQuestionsLoading: boolean;
  questionsError: Error | null;
  chapterId: number | null;
  
  // Aktuelle Frage
  currentQuestion: Question | null;
  currentQuestionIndex: number;
  totalQuestions: number;
  
  // Quiz-Status
  isQuizActive: boolean;
  isAnswerSubmitted: boolean;
  selectedAnswer: string | null;
  isCorrect: boolean | null;
  showExplanation: boolean;
  isQuizEnd: boolean;
  lastAnswerCorrect: boolean | null;
  userInputAnswer: string;
  isLoading: boolean;
  
  // Navigation
  showNavigation: boolean;
  showJokerPanel: boolean;
  showLeaderboard: boolean;
  
  // Fortschritt
  progress: number;
  correctAnswers: number;
  wrongAnswers: number;
  streak: number;
  maxStreak: number;
  
  // Belohnungen
  roundXp: number;
  roundCoins: number;
  possibleRoundXp: number;
  showRewardAnimation: boolean;
  rewardXp: number;
  rewardCoins: number;
  isAnimationPlaying: boolean;
  
  // Joker
  xpBoostUsed: boolean;
  streakBoostUsed: boolean;
  fiftyFiftyUsed: boolean;
  hintUsed: boolean;
  
  // Unterfragen
  subQuestions: Question[];
  subQuestionResults: Record<number, boolean>;
  
  // Drag & Drop
  correctDragDropAnswer: string | null;
  
  // Multiple Choice
  correctMultipleChoiceAnswer: string | null;
  
  // Aktionen
  fetchQuestions: (chapterId: number) => Promise<void>;
  setCurrentQuestion: (question: Question) => void;
  setCurrentQuestionIndex: (index: number) => void;
  setTotalQuestions: (total: number) => void;
  setIsQuizActive: (active: boolean) => void;
  setIsAnswerSubmitted: (submitted: boolean) => void;
  setSelectedAnswer: (answer: string | null) => void;
  setIsCorrect: (correct: boolean | null) => void;
  setShowNavigation: (show: boolean) => void;
  setShowJokerPanel: (show: boolean) => void;
  setShowLeaderboard: (show: boolean) => void;
  setProgress: (progress: number) => void;
  setChapterId: (chapterId: number) => void;
  setShowExplanation: (show: boolean) => void;
  setLastAnswerCorrect: (correct: boolean | null) => void;
  setUserInputAnswer: (answer: string) => void;
  setIsQuizEnd: (end: boolean) => void;
  setRoundXp: (xp: number) => void;
  setRoundCoins: (coins: number) => void;
  setPossibleRoundXp: (xp: number) => void;
  setShowRewardAnimation: (show: boolean) => void;
  setIsAnimationPlaying: (playing: boolean) => void;
  setRewardXp: (xp: number) => void;
  setRewardCoins: (coins: number) => void;
  setXpBoostUsed: (used: boolean) => void;
  setStreakBoostUsed: (used: boolean) => void;
  setFiftyFiftyUsed: (used: boolean) => void;
  setHintUsed: (used: boolean) => void;
  setSubQuestions: (questions: Question[]) => void;
  setSubQuestionResult: (id: number, isCorrect: boolean) => void;
  setIsLoading: (loading: boolean) => void;
  incrementLocalCorrectAnswers: () => void;
  incrementLocalWrongAnswers: () => void;
  updateStreak: (correct: boolean) => void;
  
  // Quiz-Logik
  handleAnswer: (questionId: number, answer: string) => Promise<boolean>;
  handleFinalAnswer: (questionId: number, answer: string) => Promise<void>;
  handleTrueFalseAnswer: (questionId: number, answer: boolean) => Promise<void>;
  handleSubquestionAnswered: (subId: number, isCorrect: boolean, overallQuestionId: number) => Promise<void>;
  finalizeQuiz: () => void;
  computeXp: () => number;
  resetQuiz: () => void;
  
  // Neue Logik
  answeredQuestions: number[];
  fetchAnsweredQuestions: (userId: string) => Promise<void>;
  isQuestionAnswered: (questionId: number) => boolean;
  
  // Level-Up Animation
  showLevelUpAnimation: boolean;
  setShowLevelUpAnimation: (show: boolean) => void;

  // Neue Funktionen aus QuizContainer
  checkQuizEnd: () => void;
  updateUserStats: () => Promise<void>;
  handleQuestionNavigation: (idx: number) => void;

  // Navigation und Fortschritt
  calculateProgress: (currentIndex: number, totalQuestions: number) => number;
  handleNavigation: (idx: number) => void;
  getAnsweredQuestions: () => number[];

  // Neue Funktionen für Belohnungen und Animation
  awardQuestion: (questionId: number, isCorrect: boolean) => Promise<boolean>;
  awardSubquestion: (subId: number, isCorrect: boolean, overallQuestionId: number) => Promise<boolean>;
  showRewardAnimationWithSound: (isCorrect: boolean) => Promise<void>;
  hideRewardAnimation: () => void;
  logQuizCompleted: (totalXp: number, possibleXp: number, medal: string, answeredCount: number, correctCount: number) => void;

  // Sound-Funktionen
  playCorrectSound: () => Promise<void>;
  playWrongSound: () => Promise<void>;

  startAnimation: () => void;

  // Neue Methoden
  nextQuestion: () => void;
  previousQuestion: () => void;
  toggleJokerPanel: () => void;
  toggleLeaderboard: () => void;

  setAnsweredQuestions: (questions: number[]) => void;

  initQuiz: () => Promise<void>;

  setQuestions: (questions: Question[]) => void;

  // Neue Typen
  answeredSubQuestions: AnsweredSubQuestion[];
  questionTypes: QuestionType[];
  questionOptions: QuestionOption[];
  
  // Event-Handler
  handleQuizEvent: (event: QuizEvent) => void;
  
  // Datenbank-Integration
  fetchUserStats: () => Promise<void>;
  fetchAnsweredSubQuestions: (userId: string) => Promise<void>;

  // Neue Funktionen aus useQuizData
  saveAnswer: (questionId: number, isCorrect: boolean, userId: string) => Promise<void>;
  saveSubAnswer: (subQuestionId: number, isCorrect: boolean, userId: string) => Promise<void>;
  completeQuiz: (chapterId: number) => Promise<void>;
  addXp: (amount: number) => Promise<void>;
  addCoins: (amount: number) => Promise<void>;

  // Neue Funktionen aus useQuizProgress
  resetProgress: () => void;
  incrementCorrectAnswers: () => void;
  incrementWrongAnswers: () => void;

  // Neue Funktionen aus useQuizRewards
  awardQuestionReward: (isCorrect: boolean) => void;
  awardSubquestionReward: (isCorrect: boolean) => void;
  resetRewards: () => void;

  userStats: UserStats | null;
}

export const useQuizStore = create<QuizState>((set, get) => {
  // Statistik-Funktionen aus dem StatsStore
  const { incrementAnsweredQuestions, incrementCorrectAnswers, addCoins, userStats } = useUserStore.getState();

  const initialState = {
    // Fragen-Management
    questions: [],
    isQuestionsLoading: false,
    questionsError: null,
    chapterId: null,
    
    // Aktuelle Frage
    currentQuestion: null,
    currentQuestionIndex: 0,
    totalQuestions: 0,
    
    // Quiz-Status
    isQuizActive: false,
    isAnswerSubmitted: false,
    selectedAnswer: null,
    isCorrect: null,
    showExplanation: false,
    isQuizEnd: false,
    lastAnswerCorrect: null,
    userInputAnswer: "",
    isLoading: false,
    
    // Navigation
    showNavigation: true,
    showJokerPanel: false,
    showLeaderboard: false,
    
    // Fortschritt
    progress: 0,
    correctAnswers: 0,
    wrongAnswers: 0,
    streak: 0,
    maxStreak: 0,
    
    // Belohnungen
    roundXp: 0,
    roundCoins: 0,
    possibleRoundXp: 0,
    showRewardAnimation: false,
    rewardXp: 0,
    rewardCoins: 0,
    isAnimationPlaying: false,
    
    // Joker
    xpBoostUsed: false,
    streakBoostUsed: false,
    fiftyFiftyUsed: false,
    hintUsed: false,
    
    // Unterfragen
    subQuestions: [],
    subQuestionResults: {},
    
    // Beantwortete Fragen
    answeredQuestions: [],

    // Level-Up Animation
    showLevelUpAnimation: false,

    // Drag & Drop
    correctDragDropAnswer: null,
    
    // Multiple Choice
    correctMultipleChoiceAnswer: null,

    // Neue Typen
    answeredSubQuestions: [],
    questionTypes: [],
    questionOptions: [],
    userStats: null,
  };

  return {
    ...initialState,
    userStats: null,

    resetQuiz: () => {
      set(initialState);
    },

    // Fragen-Management
    fetchQuestions: async (chapterId: number) => {
      const state = get();
      // Wenn bereits Fragen geladen werden, nicht erneut laden
      if (state.isQuestionsLoading) return;
      
      // Wenn bereits Fragen für dieses Kapitel geladen sind, nicht erneut laden
      if (state.questions.length > 0 && state.questions[0].chapter_id === chapterId) return;

      set({ isQuestionsLoading: true, questionsError: null });
      try {
        const { data, error } = await supabase
          .from('questions')
          .select('id, type, "Frage", "Antwort A", "Antwort B", "Antwort C", "Antwort D", "Richtige Antwort", "Begruendung", chapter_id')
          .eq('chapter_id', chapterId)
          .order('id');

        if (error) {
          console.error('Fehler beim Laden der Fragen:', error);
          set({ 
            questions: [], 
            isQuestionsLoading: false, 
            questionsError: new Error(error.message)
          });
          return;
        }

        if (!data || data.length === 0) {
          set({ 
            questions: [], 
            isQuestionsLoading: false, 
            questionsError: new Error('Keine Fragen gefunden')
          });
          return;
        }

        const mappedQuestions = data.map(q => ({
          id: q.id,
          type: q.type || "",
          question_text: q.Frage || "",
          correct_answer: q["Richtige Antwort"] || "",
          explanation: q.Begruendung || "",
          chapter_id: q.chapter_id,
          "Antwort A": q["Antwort A"] || "",
          "Antwort B": q["Antwort B"] || "",
          "Antwort C": q["Antwort C"] || "",
          "Antwort D": q["Antwort D"] || ""
        }));
        
        set({ 
          questions: mappedQuestions,
          isQuestionsLoading: false,
          questionsError: null,
          currentQuestion: mappedQuestions[0],
          currentQuestionIndex: 0,
          totalQuestions: mappedQuestions.length
        });
      } catch (error) {
        console.error('Fehler beim Laden der Fragen:', error);
        set({ 
          questionsError: error instanceof Error ? error : new Error('Fehler beim Laden der Fragen'),
          isQuestionsLoading: false 
        });
      }
    },

    setCurrentQuestion: (question) => set({ currentQuestion: question }),
    setCurrentQuestionIndex: (index: number) => {
      set({ 
        currentQuestionIndex: index,
        currentQuestion: get().questions[index],
        showExplanation: false,
        lastAnswerCorrect: null,
        userInputAnswer: "",
        isAnswerSubmitted: false
      });
    },
    setTotalQuestions: (total) => set({ totalQuestions: total }),
    setIsQuizActive: (active) => set({ isQuizActive: active }),
    setIsAnswerSubmitted: (submitted) => set({ isAnswerSubmitted: submitted }),
    setSelectedAnswer: (answer) => set({ selectedAnswer: answer }),
    setIsCorrect: (correct) => set({ isCorrect: correct }),
    setShowNavigation: (show) => set({ showNavigation: show }),
    setShowJokerPanel: (show) => set({ showJokerPanel: show }),
    setShowLeaderboard: (show) => set({ showLeaderboard: show }),
    setProgress: (progress) => set({ progress }),
    setShowExplanation: (show) => set({ showExplanation: show }),
    setLastAnswerCorrect: (correct) => set({ lastAnswerCorrect: correct }),
    setUserInputAnswer: (answer) => set({ userInputAnswer: answer }),
    setIsQuizEnd: (end) => set({ isQuizEnd: end }),
    setRoundXp: (xp) => set({ roundXp: xp }),
    setRoundCoins: (coins) => set({ roundCoins: coins }),
    setPossibleRoundXp: (xp) => set({ possibleRoundXp: xp }),
    setShowRewardAnimation: (show) => set({ showRewardAnimation: show }),
    setIsAnimationPlaying: (playing) => set({ isAnimationPlaying: playing }),
    setRewardXp: (xp) => set({ rewardXp: xp }),
    setRewardCoins: (coins) => set({ rewardCoins: coins }),
    setXpBoostUsed: (used) => set({ xpBoostUsed: used }),
    setStreakBoostUsed: (used) => set({ streakBoostUsed: used }),
    setFiftyFiftyUsed: (used) => set({ fiftyFiftyUsed: used }),
    setHintUsed: (used) => set({ hintUsed: used }),
    setIsLoading: (loading) => set({ isLoading: loading }),
    setSubQuestions: (questions) => set({ subQuestions: questions }),
    setSubQuestionResult: (subId, isCorrect) => 
      set((state) => ({
        subQuestionResults: {
          ...state.subQuestionResults,
          [subId]: isCorrect
        }
      })),
    incrementLocalCorrectAnswers: () => {
      set(state => ({
        correctAnswers: state.correctAnswers + 1
      }));
    },
    incrementLocalWrongAnswers: () => {
      set(state => ({
        wrongAnswers: state.wrongAnswers + 1
      }));
    },
    updateStreak: (correct: boolean) => set((state) => {
      if (correct) {
        const newStreak = state.streak + 1;
        return {
          streak: newStreak,
          maxStreak: Math.max(state.maxStreak, newStreak)
        };
      }
      return { streak: 0 };
    }),

    handleAnswer: async (questionId: number, answer: string): Promise<boolean> => {
      const state = get();
      const question = state.questions.find((q) => q.id === questionId);
      if (!question) return false;

      // Bestimme die Korrektheit der Antwort basierend auf dem Fragetyp
      let isCorrect = false;
      
      switch (question.type) {
        case "true_false":
          const dbAnswer = (question["Richtige Antwort"] || question.correct_answer || "").toLowerCase().trim();
          const isDbAnswerTrue = ["true", "wahr", "1", "ja", "richtig"].includes(dbAnswer);
          // Wenn der Benutzer "true" wählt und die Datenbankantwort auch "true" ist, ist es richtig
          // Wenn der Benutzer "false" wählt und die Datenbankantwort "false" ist, ist es auch richtig
          isCorrect = answer === "true" ? isDbAnswerTrue : !isDbAnswerTrue;
          console.log("handleAnswer - true_false Überprüfung:", {
            dbAnswer,
            isDbAnswerTrue,
            userAnswer: answer,
            isCorrect
          });
          break;
          
        case "lueckentext":
          // Für Lückentext: Die Antwort kommt bereits als "true" oder "false" String
          isCorrect = answer === "true";
          console.log("handleAnswer - lueckentext Überprüfung:", {
            userAnswer: answer,
            isCorrect
          });
          break;
          
        case "open_question":
          // Für offene Fragen: Die Selbsteinschätzung wird direkt übernommen
          isCorrect = answer === "true";
          break;
          
        case "multiple_choice":
          // Für Multiple Choice: Die Antwort kommt bereits als "true" oder "false" String
          isCorrect = answer === "true";
          break;
          
        default:
          // Für alle anderen Fragetypen: Direkte Textvergleich
          const normalizedDbAnswer = (question["Richtige Antwort"] || question.correct_answer || "").toLowerCase().trim();
          isCorrect = answer.toLowerCase().trim() === normalizedDbAnswer;
      }

      // Prüfe, ob die Frage bereits beantwortet wurde
      const isAlreadyAnswered = state.answeredQuestions.includes(questionId);
      console.log("handleAnswer - Frage bereits beantwortet:", isAlreadyAnswered);

      // Setze die States
      if (!isAlreadyAnswered) {
        set({
          showExplanation: true,
          lastAnswerCorrect: isCorrect,
          isAnswerSubmitted: true,
          correctAnswers: isCorrect ? state.correctAnswers + 1 : state.correctAnswers,
          roundXp: isCorrect ? state.roundXp + 10 : state.roundXp,
          roundCoins: isCorrect ? state.roundCoins + 10 : state.roundCoins - 5,
          answeredQuestions: [...state.answeredQuestions, questionId]
        });
      } else {
        set({
          showExplanation: true,
          lastAnswerCorrect: isCorrect,
          isAnswerSubmitted: true,
          showRewardAnimation: false,
          isAnimationPlaying: false
        });
      }

      return isCorrect;
    },

    handleFinalAnswer: async (questionId: number, answer: string) => {
      const state = get();
      const question = state.questions.find((q) => q.id === questionId);
      if (!question) return;

      // Speichere die Antwort für die Anzeige
      set({ userInputAnswer: answer });

      // Zeige die Erklärung an, aber warte auf Selbsteinschätzung
      set({
        showExplanation: true,
        isAnswerSubmitted: true
      });
    },

    handleTrueFalseAnswer: async (questionId: number, answer: boolean) => {
      const state = get();
      const question = state.questions?.find((q) => q.id === questionId);
      
      if (!question) {
        console.error("Frage nicht gefunden");
        return;
      }

      // Prüfe, ob die Frage bereits beantwortet wurde
      const isAlreadyAnswered = state.answeredQuestions.includes(questionId);
      
      // Bestimme, ob die Antwort korrekt ist
      const correctAnswer = typeof question.correct_answer === 'string' 
        ? ["true", "wahr", "1", "ja", "richtig"].includes(question.correct_answer.toLowerCase().trim())
        : question.correct_answer;
      const isCorrect = answer === correctAnswer;
      
      console.log("handleTrueFalseAnswer", {
        questionId,
        answer,
        correctAnswer,
        isCorrect,
        isAlreadyAnswered
      });

      // Wenn die Frage noch nicht beantwortet wurde, aktualisiere die Statistiken
      if (!isAlreadyAnswered) {
        // Store-Zustand aktualisieren
        set(state => ({
          correctAnswers: isCorrect ? state.correctAnswers + 1 : state.correctAnswers,
          roundXp: isCorrect ? state.roundXp + 10 : state.roundXp,
          roundCoins: isCorrect ? state.roundCoins + 10 : state.roundCoins - 5,
          lastAnswerCorrect: isCorrect,
          showExplanation: true,
          isAnswerSubmitted: true,
          answeredQuestions: [...state.answeredQuestions, questionId]
        }));

        // Debug-Logging
        console.log("Neue Store-Werte:", {
          correctAnswers: get().correctAnswers,
          roundXp: get().roundXp,
          roundCoins: get().roundCoins
        });

        // Sound und Animation abspielen
        if (isCorrect) {
          await state.playCorrectSound();
        } else {
          await state.playWrongSound();
        }

        // Frage als beantwortet markieren
        await state.awardQuestion(questionId, isCorrect);
      } else {
        // Wenn die Frage bereits beantwortet wurde, nur Status aktualisieren
        set({
          lastAnswerCorrect: isCorrect,
          showExplanation: true,
          isAnswerSubmitted: true
        });

        // Sound abspielen
        if (isCorrect) {
          await state.playCorrectSound();
        } else {
          await state.playWrongSound();
        }
      }
    },

    handleSubquestionAnswered: async (subId: number, isCorrect: boolean, overallQuestionId: number) => {
      const state = get();
      const xpEarned = isCorrect ? 5 : 0;

      try {
        // Unterfrage als beantwortet markieren
        await state.awardSubquestion(subId, isCorrect, overallQuestionId);

        // Benutzerstatistiken aktualisieren
        const user = await authService.getSession();
        if (user.data?.user) {
          if (isCorrect) {
            await userService.addXp(user.data.user.id, xpEarned);
          }
        }

        // Prüfen, ob alle Unterfragen beantwortet wurden
        const { data: allSubQuestions } = await quizService.fetchSubquestions(overallQuestionId);
        const { data: answeredSubQuestions } = await quizService.fetchAnsweredSubquestions(user.data?.user?.id || '');

        if (allSubQuestions && answeredSubQuestions) {
          const allAnswered = allSubQuestions.every(subQuestion =>
            answeredSubQuestions.some(answered => answered.subquestion_id === subQuestion.id)
          );

          // Nur wenn alle Unterfragen beantwortet sind, die Hauptfrage als beantwortet markieren
          if (allAnswered) {
            await state.awardQuestion(overallQuestionId, true);
            // Aktualisiere die lokale Liste der beantworteten Fragen
            const newAnsweredQuestions = [...state.answeredQuestions, overallQuestionId];
            state.setAnsweredQuestions(newAnsweredQuestions);
          }
        }

      } catch (error) {
        console.error("Fehler beim Verarbeiten der Unterfrage:", error);
      }
    },

    finalizeQuiz: () => {
      set({ isQuizEnd: true });
    },

    computeXp: () => {
      const { correctAnswers, streak, xpBoostUsed } = get();
      let xp = correctAnswers * 10 + streak * 5;
      if (xpBoostUsed) {
        xp *= 1.5;
      }
      return Math.round(xp);
    },

    fetchAnsweredQuestions: async (userId: string) => {
      try {
        const { data, error } = await supabase
          .from('answered_questions')
          .select('question_id')
          .eq('user_id', userId);

        if (error) throw error;

        set({ 
          answeredQuestions: data.map(item => item.question_id).filter((id): id is number => id !== null)
        });
      } catch (error) {
        console.error('Fehler beim Laden der beantworteten Fragen:', error);
      }
    },

    isQuestionAnswered: (questionId: number) => {
      return get().answeredQuestions.includes(questionId);
    },

    // Neue Funktionen aus QuizContainer
    checkQuizEnd: () => {
      const { isQuizEnd, questions, currentQuestionIndex, finalizeQuiz } = get();
      if (!isQuizEnd && questions && currentQuestionIndex >= questions.length) {
        finalizeQuiz();
      }
    },

    updateUserStats: async () => {
      const user = await authService.getSession();
      if (user.data?.user) {
        const { fetchUserStats } = useUserStore.getState();
        await fetchUserStats();
      }
    },

    handleQuestionNavigation: (idx: number) => {
      const { 
        questions, 
        isAnimationPlaying,
        setCurrentQuestionIndex,
        setShowExplanation,
        setLastAnswerCorrect,
        setUserInputAnswer,
        setIsAnswerSubmitted,
        setProgress
      } = get();

      if (isAnimationPlaying) return;
      
      // Setze den aktuellen Index
      setCurrentQuestionIndex(idx);
      
      // Setze den Status zurück
      setShowExplanation(false);
      setLastAnswerCorrect(null);
      setUserInputAnswer("");
      setIsAnswerSubmitted(false);
      
      // Aktualisiere den Fortschritt
      setProgress((idx / questions.length) * 100);
    },

    // Navigation und Fortschritt
    calculateProgress: (currentIndex: number, totalQuestions: number) => {
      return totalQuestions > 0 ? (currentIndex / totalQuestions) * 100 : 0;
    },
    
    handleNavigation: (idx: number) => {
      const { 
        questions, 
        isAnimationPlaying,
        setCurrentQuestionIndex,
        setShowExplanation,
        setLastAnswerCorrect,
        setUserInputAnswer,
        setIsAnswerSubmitted,
        setProgress
      } = get();

      if (isAnimationPlaying) return;
      
      // Setze den aktuellen Index
      setCurrentQuestionIndex(idx);
      
      // Setze den Status zurück
      setShowExplanation(false);
      setLastAnswerCorrect(null);
      setUserInputAnswer("");
      setIsAnswerSubmitted(false);
      
      // Aktualisiere den Fortschritt
      setProgress((idx / questions.length) * 100);
    },
    
    getAnsweredQuestions: () => {
      return get().answeredQuestions;
    },

    // Neue Funktionen für Belohnungen und Animation
    awardQuestion: async (questionId: number, isCorrect: boolean) => {
      const { 
        setAnsweredQuestions, 
        answeredQuestions,
        roundXp,
        roundCoins,
        streak,
        xpBoostUsed
      } = get();
      
      const { addToTotalXp, addToTotalCoins } = useUserStore.getState();
      const user = await authService.getSession();
      if (!user.data?.user) {
        console.error("Kein Benutzer angemeldet");
        return false;
      }

      try {
        // 1) Prüfen, ob die Frage bereits beantwortet wurde
        const { data: existingAnswers, error: fetchError } = await quizService.fetchAnsweredQuestions(user.data.user.id);
        
        if (fetchError) {
          console.error("Error fetching answered questions:", fetchError);
          return false;
        }
        
        const alreadyAnswered = existingAnswers?.some(
          (answer) => answer.question_id === questionId
        );
        
        if (alreadyAnswered) {
          console.log("Frage bereits beantwortet");
          return true;
        }
        
        // 2) Backend-Funktion aufrufen
        const { data, error } = await supabase.rpc('calculate_and_award_xp', {
          p_user_id: user.data.user.id,
          p_correct_question_ids: isCorrect ? [questionId] : [],
          p_correct_subquestion_ids: []
        });
        
        if (error) {
          console.error("Error calculating XP:", error);
          return false;
        }
        
        // 3) Store aktualisieren für die Navigation
        setAnsweredQuestions([...answeredQuestions, questionId]);
        
        // 4) Belohnungen für die Animation setzen
        const xp = isCorrect ? 10 : 0;
        const coins = isCorrect ? 10 : -5;
        const boostedXp = xpBoostUsed ? xp * 1.5 : xp;

        set({ 
          roundXp: roundXp + boostedXp,
          roundCoins: roundCoins + coins,
          rewardXp: boostedXp,
          rewardCoins: coins,
          showRewardAnimation: true,
          isAnimationPlaying: true
        });
        
        return true;
      } catch (err) {
        console.error("Error in awardQuestion:", err);
        return false;
      }
    },

    awardSubquestion: async (subId: number, isCorrect: boolean, overallQuestionId: number) => {
      const user = await authService.getSession();
      if (!user.data?.user) {
        console.error("Kein Benutzer angemeldet");
        return false;
      }

      try {
        // 1) Prüfen, ob die Unterfrage bereits beantwortet wurde
        const { data: existingSubAnswers, error: fetchSubError } = await quizService.fetchAnsweredSubquestions(user.data.user.id);
        
        if (fetchSubError) {
          console.error("Error fetching answered subquestions:", fetchSubError);
          return false;
        }
        
        const alreadyAnswered = existingSubAnswers?.some(
          (answer) => answer.subquestion_id === subId
        );
        
        if (alreadyAnswered) {
          console.log("Unterfrage bereits beantwortet");
          return true;
        }
        
        // 2) Backend-Funktion aufrufen
        const { data, error } = await supabase.rpc('calculate_and_award_xp', {
          p_user_id: user.data.user.id,
          p_correct_question_ids: [],
          p_correct_subquestion_ids: isCorrect ? [subId] : []
        });
        
        if (error) {
          console.error("Error calculating XP:", error);
          return false;
        }
        
        // 3) Prüfen, ob alle Unterfragen der Hauptfrage beantwortet wurden
        const { data: allSubQuestions, error: fetchAllSubError } = await quizService.fetchSubquestions(overallQuestionId);
        
        if (fetchAllSubError) {
          console.error("Error fetching all subquestions:", fetchAllSubError);
          return true;
        }
        
        // Aktualisiere die existingSubAnswers-Liste mit der neuen Antwort
        const updatedSubAnswers = [...(existingSubAnswers || []), { subquestion_id: subId }];
        
        const allSubQuestionsAnswered = allSubQuestions?.every(
          (subQuestion) => updatedSubAnswers.some(
            (answer) => answer.subquestion_id === subQuestion.id
          )
        );
        
        // 4) Store aktualisieren für die Navigation, wenn alle Unterfragen beantwortet wurden
        if (allSubQuestionsAnswered) {
          const { answeredQuestions, setAnsweredQuestions } = get();
          if (!answeredQuestions.includes(overallQuestionId)) {
            setAnsweredQuestions([...answeredQuestions, overallQuestionId]);
          }
        }
        
        return true;
      } catch (err) {
        console.error("Error in awardSubquestion:", err);
        return false;
      }
    },

    showRewardAnimationWithSound: async (isCorrect: boolean) => {
      const { 
        currentQuestion, 
        answeredQuestions, 
        playCorrectSound, 
        playWrongSound,
        setShowRewardAnimation,
        setIsAnimationPlaying,
        setRewardXp,
        setRewardCoins,
        roundXp,
        roundCoins,
        setRoundXp,
        setRoundCoins,
        setLastAnswerCorrect
      } = get();

      if (!currentQuestion) return;

      // Prüfe ob die Frage bereits beantwortet wurde
      if (!answeredQuestions.includes(currentQuestion.id)) {
        // Spiele Sound ab
        if (isCorrect) {
          await playCorrectSound();
        } else {
          await playWrongSound();
        }

        if (isCorrect) {
          set({ 
            rewardXp: 10,
            rewardCoins: 5,
            roundXp: get().roundXp + 10,
            roundCoins: get().roundCoins + 5,
            lastAnswerCorrect: isCorrect,
            isAnimationPlaying: true,
            showRewardAnimation: true,
            answeredQuestions: [...get().answeredQuestions, currentQuestion.id]
          });

          // Debug-Logging
          console.log("Neue correctAnswers nach Erhöhung:", get().correctAnswers);
        } else {
          set({ 
            rewardXp: 0,
            rewardCoins: -5,
            roundCoins: get().roundCoins - 5,
            lastAnswerCorrect: isCorrect,
            isAnimationPlaying: true,
            showRewardAnimation: true,
            answeredQuestions: [...get().answeredQuestions, currentQuestion.id]
          });
        }

        // Setze Timer für das automatische Beenden der Animation
        setTimeout(() => {
          set({ 
            showRewardAnimation: false,
            isAnimationPlaying: false
          });
        }, 2000);
      } else {
        console.log("Frage bereits beantwortet, keine Animation anzeigen");
        set({ 
          showRewardAnimation: false,
          isAnimationPlaying: false,
          lastAnswerCorrect: isCorrect // Behalte den Status für die Anzeige
        });
      }
    },

    hideRewardAnimation: () => {
      const { setShowRewardAnimation, setIsAnimationPlaying } = get();
      setShowRewardAnimation(false);
      setIsAnimationPlaying(false);
    },

    logQuizCompleted: (totalXp: number, possibleXp: number, medal: string, answeredCount: number, correctCount: number) => {
      console.log('Quiz abgeschlossen', { 
        totalXp, 
        possibleXp, 
        medal, 
        performance: `${correctCount}/${answeredCount} korrekt`,
        percentage: Math.round((correctCount / answeredCount) * 100)
      });
    },

    // Sound-Funktionen
    playCorrectSound: async () => {
      const audio = new Audio(correctSound);
      await audio.play();
    },
    
    playWrongSound: async () => {
      const audio = new Audio(wrongSound);
      await audio.play();
    },

    startAnimation: () => {
      const { 
        isAnimationPlaying,
        setIsAnimationPlaying,
        setShowRewardAnimation,
        setRewardXp,
        setRewardCoins,
        roundXp,
        roundCoins,
        setRoundXp,
        setRoundCoins,
        setLastAnswerCorrect
      } = get();

      if (isAnimationPlaying) return;

      setIsAnimationPlaying(true);
      setShowRewardAnimation(true);

      // Belohnungen für die Animation setzen
      setRoundXp(roundXp + 10);
      setRoundCoins(roundCoins + 10);
      setRewardXp(10);
      setRewardCoins(10);

      // WICHTIG: KEIN Timer hier mehr setzen, da die Animation jetzt von der Komponente selbst gesteuert wird
      // Die Komponente wird nach 10 Sekunden automatisch ausgeblendet
    },

    // Neue Methoden
    nextQuestion: () => {
      const { 
        currentQuestionIndex, 
        totalQuestions, 
        questions, 
        setCurrentQuestionIndex, 
        setCurrentQuestion,
        setIsQuizEnd,
        setShowExplanation,
        setLastAnswerCorrect,
        setUserInputAnswer,
        setIsAnswerSubmitted
      } = get();

      // Erhöhe den Index
      const nextIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIndex);

      // Wenn wir am Ende sind, Quiz beenden
      if (nextIndex >= questions.length) {
        setIsQuizEnd(true);
        return;
      }

      // Sonst zur nächsten Frage
      setCurrentQuestion(questions[nextIndex]);
      setShowExplanation(false);
      setLastAnswerCorrect(null);
      setUserInputAnswer("");
      setIsAnswerSubmitted(false);
    },
    previousQuestion: () => {
      const { currentQuestionIndex, questions, setCurrentQuestionIndex, setCurrentQuestion } = get();
      if (currentQuestionIndex > 0) {
        const prevIndex = currentQuestionIndex - 1;
        setCurrentQuestionIndex(prevIndex);
        setCurrentQuestion(questions[prevIndex]);
      }
    },
    toggleJokerPanel: () => {
      const { showJokerPanel, setShowJokerPanel } = get();
      setShowJokerPanel(!showJokerPanel);
    },
    toggleLeaderboard: () => {
      const { showLeaderboard, setShowLeaderboard } = get();
      setShowLeaderboard(!showLeaderboard);
    },

    setAnsweredQuestions: (questions) => set({ answeredQuestions: questions }),

    initQuiz: async () => {
      const state = get();
      const user = await authService.getSession();
      
      if (!user.data?.user || !state.chapterId) {
        set({ isLoading: false });
        return;
      }

      // Prüfe ob Fragen bereits geladen sind
      if (state.questions.length > 0 && state.questions[0].chapter_id === state.chapterId) {
        set({ 
          isLoading: false,
          isQuizActive: true,
          isQuizEnd: false,
          currentQuestionIndex: 0,
          currentQuestion: state.questions[0]
        });
        return;
      }

      try {
        set({ isLoading: true });
        
        const { data, error } = await supabase
          .from('questions')
          .select('id, type, "Frage", "Antwort A", "Antwort B", "Antwort C", "Antwort D", "Richtige Antwort", "Begruendung", chapter_id')
          .eq('chapter_id', state.chapterId)
          .order('id');

        if (error) throw error;

        if (!data || data.length === 0) {
          set({ 
            isLoading: false,
            questions: []
          });
          return;
        }

        const mappedQuestions = data.map(q => ({
          id: q.id,
          type: q.type || "",
          question_text: q.Frage || "",
          correct_answer: q["Richtige Antwort"] || "",
          explanation: q.Begruendung || "",
          chapter_id: q.chapter_id,
          "Antwort A": q["Antwort A"] || "",
          "Antwort B": q["Antwort B"] || "",
          "Antwort C": q["Antwort C"] || "",
          "Antwort D": q["Antwort D"] || ""
        }));

        set({
          questions: mappedQuestions,
          currentQuestionIndex: 0,
          currentQuestion: mappedQuestions[0],
          isLoading: false,
          isQuizActive: true,
          isQuizEnd: false,
          isAnswerSubmitted: false,
          selectedAnswer: null,
          isCorrect: null,
          showExplanation: false,
          lastAnswerCorrect: null,
          userInputAnswer: "",
          progress: 0,
          roundXp: 0,
          roundCoins: 0,
          possibleRoundXp: 0,
          showRewardAnimation: false,
          rewardXp: 0,
          rewardCoins: 0,
          isAnimationPlaying: false,
          xpBoostUsed: false,
          streakBoostUsed: false,
          fiftyFiftyUsed: false,
          hintUsed: false,
          subQuestionResults: {},
          correctAnswers: 0,
          wrongAnswers: 0,
          streak: 0,
          maxStreak: 0
        });

      } catch (error) {
        console.error('Fehler beim Laden der Fragen:', error);
        set({ 
          isLoading: false,
          questions: []
        });
      }
    },

    setQuestions: (questions: Question[]) => set({ questions }),

    // Level-Up Animation
    setShowLevelUpAnimation: (show: boolean) => set({ showLevelUpAnimation: show }),

    // Event-Handler
    handleQuizEvent: (event: QuizEvent) => {
      switch (event.type) {
        case 'ANSWER_SUBMITTED':
          set(state => ({
            answeredQuestions: [...state.answeredQuestions, event.payload.question_id].filter((id): id is number => id !== null)
          }));
          break;
        case 'SUB_ANSWER_SUBMITTED':
          set(state => ({
            answeredSubQuestions: [...state.answeredSubQuestions, {
              id: 0, // Wird von der Datenbank generiert
              sub_question_id: event.payload.subQuestionId,
              user_id: '', // Wird beim Speichern gesetzt
              is_correct: event.payload.isCorrect,
              answered_at: event.payload.timestamp
            }]
          }));
          break;
        case 'PROGRESS_UPDATED':
          set({
            currentQuestionIndex: event.payload.currentIndex,
            totalQuestions: event.payload.totalQuestions,
            correctAnswers: event.payload.correctAnswers,
            wrongAnswers: event.payload.wrongAnswers,
            streak: event.payload.streak,
            maxStreak: event.payload.maxStreak
          });
          break;
        case 'REWARDS_UPDATED':
          set({
            roundXp: event.payload.xp,
            roundCoins: event.payload.coins,
            possibleRoundXp: event.payload.possibleXp,
            showRewardAnimation: event.payload.showAnimation,
            isAnimationPlaying: event.payload.isAnimationPlaying
          });
          break;
        case 'ANIMATION_STARTED':
          set({
            showRewardAnimation: event.payload.showReward,
            showLevelUpAnimation: event.payload.showLevelUp,
            isAnimationPlaying: event.payload.isPlaying
          });
          break;
        case 'ANIMATION_ENDED':
          set({
            showRewardAnimation: false,
            showLevelUpAnimation: false,
            isAnimationPlaying: false
          });
          break;
      }
    },

    // Datenbank-Integration
    fetchUserStats: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('user_stats')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error) throw error;

        if (data) {
          set({
            correctAnswers: data.correct_answers || 0,
            streak: data.streak || 0,
            maxStreak: data.streak || 0 // Verwende streak statt max_streak
          });
        }
      } catch (error) {
        console.error('Fehler beim Laden der Benutzerstatistiken:', error);
      }
    },
    fetchAnsweredSubQuestions: async (userId: string) => {
      try {
        const { data, error } = await supabase
          .from('answered_cases_subquestions')
          .select('*')
          .eq('user_id', userId);

        if (error) throw error;

        if (data) {
          // Transformiere die Daten in das korrekte Format
          const transformedData: AnsweredSubQuestion[] = data.map(item => ({
            id: item.id,
            sub_question_id: item.subquestion_id,
            user_id: item.user_id,
            is_correct: item.is_correct || false,
            answered_at: new Date().toISOString() // Standardwert für answered_at
          }));
          
          set({ answeredSubQuestions: transformedData });
        }
      } catch (error) {
        console.error('Fehler beim Laden der beantworteten Unterfragen:', error);
      }
    },

    // Neue Funktionen aus useQuizData
    saveAnswer: async (questionId: number, isCorrect: boolean, userId: string) => {
      const state = get();
      const question = state.questions.find(q => q.id === questionId);
      
      if (!question) {
        console.error('Frage nicht gefunden');
        return;
      }

      try {
        const answerData = {
          question_id: questionId,
          user_id: userId,
          is_correct: isCorrect,
          answered_at: new Date().toISOString(),
          chapter_id: question.chapter_id || 1 // Standardwert 1, falls nicht definiert
        };

        const { error } = await supabase
          .from('answered_questions')
          .insert(answerData);

        if (error) throw error;

        // Event-Emission
        const eventBus = useQuizEventBus.getState();
        eventBus.emit({
          type: 'ANSWER_SUBMITTED',
          payload: answerData
        });

      } catch (error) {
        console.error('Fehler beim Speichern der Antwort:', error);
      }
    },

    saveSubAnswer: async (subQuestionId, isCorrect, userId) => {
      try {
        const { error } = await supabase
          .from('answered_cases_subquestions')
          .insert({
            subquestion_id: subQuestionId,
            user_id: userId,
            is_correct: isCorrect,
            answered_at: new Date().toISOString()
          });

        if (error) throw error;

        // Event auslösen
        const eventBus = useQuizEventBus.getState();
        eventBus.emit({
          type: 'SUB_ANSWER_SUBMITTED',
          payload: {
            subQuestionId,
            isCorrect,
            timestamp: new Date().toISOString()
          }
        });
      } catch (error) {
        console.error('Fehler beim Speichern der Unterfragen-Antwort:', error);
      }
    },

    completeQuiz: async (chapterId) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Aktuelle Statistiken abrufen
      const { data: currentStats, error: fetchError } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (fetchError) throw fetchError;

      // Berechne neue Werte
      const newQuestionsAnswered = (currentStats?.questions_answered || 0) + 1;
      const newTotalXp = (currentStats?.total_xp || 0) + get().roundXp;
      const newTotalCoins = (currentStats?.total_coins || 0) + get().roundCoins;
      const newStreak = get().streak;
      const newCorrectAnswers = (currentStats?.correct_answers || 0) + get().correctAnswers;

      // Aktualisiere die Statistiken
      const { error } = await supabase
        .from('user_stats')
        .update({ 
          last_played: new Date().toISOString(),
          questions_answered: newQuestionsAnswered,
          total_xp: newTotalXp,
          total_coins: newTotalCoins,
          streak: newStreak,
          correct_answers: newCorrectAnswers,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) throw error;

      // Level-Update durchführen
      const { data: levelData, error: levelError } = await supabase
        .rpc('update_level_on_xp_change', {
          p_user_id: user.id,
          p_new_xp: newTotalXp
        });

      if (levelError) {
        console.error('Fehler beim Level-Update:', levelError);
      }

      // Event auslösen
      const eventBus = useQuizEventBus.getState();
      eventBus.emit({
        type: 'QUIZ_COMPLETED',
        payload: {
          userId: user.id,
          chapterId,
          timestamp: new Date().toISOString()
        }
      });
    },

    addXp: async (amount) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('user_stats')
        .update({ total_xp: amount } as Partial<UserStats>)
        .eq('user_id', user.id);

      if (error) throw error;
    },

    addCoins: async (amount) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('user_stats')
        .update({ total_coins: amount } as Partial<UserStats>)
        .eq('user_id', user.id);

      if (error) throw error;
    },

    // Neue Funktionen aus useQuizProgress
    resetProgress: () => {
      set({
        currentQuestionIndex: 0,
        totalQuestions: 0,
        correctAnswers: 0,
        wrongAnswers: 0,
        streak: 0,
        maxStreak: 0,
        progress: 0
      });
    },

    incrementCorrectAnswers: () => {
      set(state => ({
        correctAnswers: state.correctAnswers + 1
      }));
    },

    incrementWrongAnswers: () => {
      set(state => ({
        wrongAnswers: state.wrongAnswers + 1
      }));
    },

    // Neue Funktionen aus useQuizRewards
    awardQuestionReward: (isCorrect) => {
      const { streak, xpBoostUsed } = get();
      const xp = isCorrect ? 10 + (streak * 2) : 0;
      const coins = isCorrect ? 5 : -2;

      set(state => ({
        roundXp: state.roundXp + (xpBoostUsed ? xp * 1.5 : xp),
        roundCoins: state.roundCoins + coins,
        rewardXp: xpBoostUsed ? xp * 1.5 : xp,
        rewardCoins: coins,
        showRewardAnimation: true,
        isAnimationPlaying: true
      }));
    },

    awardSubquestionReward: (isCorrect) => {
      const xp = isCorrect ? 5 : 0;
      const coins = isCorrect ? 3 : -1;

      set(state => ({
        roundXp: state.roundXp + xp,
        roundCoins: state.roundCoins + coins,
        rewardXp: xp,
        rewardCoins: coins,
        showRewardAnimation: true,
        isAnimationPlaying: true
      }));
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
    },

    setChapterId: (chapterId: number) => set({ chapterId }),
  }
}) 