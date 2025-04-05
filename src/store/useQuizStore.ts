import { create } from 'zustand'
import { Database } from '../types/supabase'
import { supabase } from '../supabaseClient'
import { useUserStore } from './useUserStore'
import correctSound from '../assets/sounds/correct.mp3'
import wrongSound from '../assets/sounds/wrong.mp3'
import { useSoundStore } from './useSoundStore'
import { quizService } from '../api/quizService'
import { userService } from '../api/userService'
import { authService } from '../api/authService'

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
  computeXp: () => void;
  resetQuiz: () => void;
  
  // Neue Logik
  answeredQuestions: number[];
  fetchAnsweredQuestions: (userId: string) => Promise<void>;
  isQuestionAnswered: (questionId: number) => boolean;
  
  // Level-Up Animation
  showLevelUpAnimation: boolean;
  setShowLevelUpAnimation: (show: boolean) => void;

  // Neue Funktionen aus QuizContainer
  computePossibleXp: () => Promise<void>;
  checkQuizEnd: () => void;
  updateUserStats: () => Promise<void>;
  handleQuestionNavigation: (idx: number) => void;

  // Navigation und Fortschritt
  calculateProgress: () => number;
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
}

export const useQuizStore = create<QuizState>((set, get) => {
  // Statistik-Funktionen aus dem StatsStore
  const { incrementAnsweredQuestions, incrementCorrectAnswers, addCoins, userStats } = useUserStore.getState();

  const initialState = {
    // Fragen-Management
    questions: [],
    isQuestionsLoading: false,
    questionsError: null,
    
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
  };

  return {
    ...initialState,

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
        const { data, error } = await quizService.fetchQuestions(chapterId);
        if (error) throw error;

        if (data) {
          const questions = data.map(q => ({
            id: q.id,
            type: q.type || "",
            question_text: q.Frage || "",
            correct_answer: q["Richtige Antwort"] || "",
            explanation: q.Begründung,
            chapter_id: q.chapter_id,
            "Antwort A": q["Antwort A"],
            "Antwort B": q["Antwort B"],
            "Antwort C": q["Antwort C"],
            "Antwort D": q["Antwort D"],
            Begründung: q.Begründung,
            Frage: q.Frage,
            "Richtige Antwort": q["Richtige Antwort"]
          }));
          
          set({ 
            questions,
            isQuestionsLoading: false,
            questionsError: null,
            currentQuestion: questions[0],
            currentQuestionIndex: 0,
            totalQuestions: questions.length
          });
        }
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
      // XP-Berechnung implementieren
    },

    fetchAnsweredQuestions: async (userId: string) => {
      try {
        const { data, error } = await supabase
          .from('answered_questions')
          .select('question_id')
          .eq('user_id', userId);

        if (error) throw error;

        set({ 
          answeredQuestions: data.map(item => item.question_id)
        });
      } catch (error) {
        console.error('Fehler beim Laden der beantworteten Fragen:', error);
      }
    },

    isQuestionAnswered: (questionId: number) => {
      return get().answeredQuestions.includes(questionId);
    },

    // Neue Funktionen aus QuizContainer
    computePossibleXp: async () => {
      const { questions, setPossibleRoundXp } = get();
      if (!questions || questions.length === 0) return;
      
      let total = 0;
      for (const q of questions) {
        if (q.type === "cases") {
          const { data: subs, error } = await supabase
            .from("cases_subquestions")
            .select("id")
            .eq("question_id", q.id);
          if (!error && subs) total += subs.length * 10;
        } else {
          total += 10;
        }
      }
      setPossibleRoundXp(total);
    },

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
        await fetchUserStats(user.data.user.id);
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
    calculateProgress: () => {
      const { questions, currentQuestionIndex } = get();
      return questions 
        ? ((currentQuestionIndex + 1) / questions.length) * 100
        : 0;
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
        answeredQuestions 
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
        
        // 2) answered_questions-Eintrag erstellen
        const { error } = await quizService.answerQuestion(user.data.user.id, questionId, isCorrect);
        
        if (error) {
          console.error("Error awarding question:", error);
          return false;
        }
        
        // 3) Benutzerstatistiken und Belohnungen aktualisieren
        if (isCorrect) {
          await Promise.all([
            userService.incrementCorrectAnswers(user.data.user.id),
            userService.addXp(user.data.user.id, 10),
            userService.addCoins(user.data.user.id, 10)
          ]);
          // Live-Update der XP und Münzen im UserStore
          addToTotalXp(10);
          addToTotalCoins(10);
        } else {
          await userService.addCoins(user.data.user.id, -5);
          // Live-Update der Münzen im UserStore
          addToTotalCoins(-5);
        }
        await userService.incrementAnsweredQuestions(user.data.user.id);
        
        // 4) Store aktualisieren für die Navigation
        setAnsweredQuestions([...answeredQuestions, questionId]);
        
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
          
          // Keine Belohnungen setzen, wenn die Unterfrage bereits beantwortet wurde
          set({ rewardXp: 0 });
          set({ rewardCoins: 0 });
          
          return true;
        }
        
        // 2) answered_cases_subquestions-Eintrag erstellen
        const { error } = await quizService.answerSubquestion(user.data.user.id, subId, isCorrect);
        
        if (error) {
          console.error("Error awarding subquestion:", error);
          return false;
        }
        
        // 3) Benutzerstatistiken aktualisieren
        const { addToTotalXp, addToTotalCoins } = useUserStore.getState();
        
        if (isCorrect) {
          await Promise.all([
            userService.incrementCorrectAnswers(user.data.user.id),
            userService.addXp(user.data.user.id, 10),
            userService.addCoins(user.data.user.id, 5)
          ]);
          // Live-Update der XP und Münzen im UserStore
          addToTotalXp(10);
          addToTotalCoins(5);
          
          // Belohnungen für die Animation setzen
          set({ rewardXp: 10 });
          set({ rewardCoins: 5 });
        } else {
          await userService.addCoins(user.data.user.id, -5);
          // Live-Update der Münzen im UserStore
          addToTotalCoins(-5);
          
          // Belohnungen für die Animation setzen
          set({ rewardXp: 0 });
          set({ rewardCoins: -5 });
        }
        
        // 4) Prüfen, ob alle Unterfragen der Hauptfrage beantwortet wurden
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
        
        // 5) Store aktualisieren für die Navigation, wenn alle Unterfragen beantwortet wurden
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
      // Direkte Referenz auf die Funktionen, damit sie nicht aus dem State geholt werden
      const { 
        isAnimationPlaying,
        currentQuestion,
        answeredQuestions,
        playCorrectSound,
        playWrongSound
      } = get();
      
      console.log("showRewardAnimationWithSound aufgerufen mit isCorrect:", isCorrect);
      
      // Wenn keine aktuelle Frage oder Animation läuft, beenden
      if (!currentQuestion) {
        console.log("Keine aktuelle Frage vorhanden");
        return;
      }
      
      // Wenn bereits eine Animation läuft, beenden
      if (isAnimationPlaying) {
        console.log("Animation läuft bereits");
        return;
      }
      
      // Sound abspielen
      if (isCorrect) {
        await playCorrectSound();
      } else {
        await playWrongSound();
      }
      
      // Prüfe, ob die Frage bereits beantwortet wurde
      const isAlreadyAnswered = answeredQuestions.includes(currentQuestion.id);
      console.log("Frage bereits beantwortet:", isAlreadyAnswered);
      
      // Animation und Belohnungen nur anzeigen, wenn die Frage noch nicht beantwortet wurde
      if (!isAlreadyAnswered) {
        console.log("Zeige Animation");
        
        // Belohnungen setzen
        if (isCorrect) {
          // Hole den aktuellen State
          const currentState = get();
          
          // Setze die neuen Werte
          set({ 
            rewardXp: 10,
            rewardCoins: 10,
            roundXp: currentState.roundXp + 10,
            roundCoins: currentState.roundCoins + 10,
            correctAnswers: currentState.correctAnswers + 1,
            lastAnswerCorrect: isCorrect,
            isAnimationPlaying: true,
            showRewardAnimation: true,
            answeredQuestions: [...currentState.answeredQuestions, currentQuestion.id]
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
      const { 
        setQuestions, 
        setCurrentQuestion, 
        setTotalQuestions, 
        setCurrentQuestionIndex, 
        setAnsweredQuestions,
        setIsQuizEnd,
        setIsQuizActive,
        resetQuiz,
        setProgress
      } = get();
      
      try {
        // Quiz vollständig zurücksetzen
        resetQuiz();
        
        // Benutzer-Session holen
        const user = await authService.getSession();
        if (!user.data?.user) {
          console.error("Kein Benutzer angemeldet");
          return;
        }

        // Fragen laden
        const { data: questionsData, error } = await quizService.fetchQuestions(1);
        if (error || !questionsData) {
          console.error("Fehler beim Laden der Fragen:", error);
          return;
        }

        // Transformiere die Daten in das erwartete Question-Format
        const questions: Question[] = questionsData.map(q => ({
          id: q.id,
          type: q.type || "",
          question_text: q.Frage || "",
          correct_answer: q["Richtige Antwort"] || "",
          explanation: q.Begründung,
          chapter_id: q.chapter_id,
          "Antwort A": q["Antwort A"],
          "Antwort B": q["Antwort B"],
          "Antwort C": q["Antwort C"],
          "Antwort D": q["Antwort D"],
          Begründung: q.Begründung,
          Frage: q.Frage,
          "Richtige Antwort": q["Richtige Antwort"]
        }));

        // Beantwortete Fragen laden
        const { data: answeredQuestions } = await quizService.fetchAnsweredQuestions(user.data.user.id);
        const answeredQuestionIds = answeredQuestions?.map(q => q.question_id).filter((id): id is number => id !== null) || [];

        // Store aktualisieren
        set({
          questions,
          totalQuestions: questions.length,
          currentQuestion: questions[0],
          currentQuestionIndex: 0,
          isQuizActive: true,
          isQuizEnd: false,
          progress: 0,
          answeredQuestions: answeredQuestionIds
        });

      } catch (error) {
        console.error("Fehler bei der Quiz-Initialisierung:", error);
      }
    },

    setQuestions: (questions: Question[]) => set({ questions }),

    // Level-Up Animation
    setShowLevelUpAnimation: (show: boolean) => set({ showLevelUpAnimation: show }),
  }
}) 