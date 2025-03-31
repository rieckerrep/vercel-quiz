import { create } from 'zustand'
import { Database } from '../types/supabase'
import { supabase } from '../supabaseClient'
import { useUserStore } from './useUserStore'
import correctSound from '../assets/sounds/correct.mp3'
import wrongSound from '../assets/sounds/wrong.mp3'

export interface Question {
  id: number;
  type: string;
  Frage: string;
  Begründung: string | null;
  "Richtige Antwort": string;
  chapter_id: number;
  course_id: number | null;
  "Antwort A": string | null;
  "Antwort B": string | null;
  "Antwort C": string | null;
  "Antwort D": string | null;
  sub_questions?: Question[];
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
  setIsAnimationPlaying: (playing: boolean) => void;
  setRewardXp: (xp: number) => void;
  setRewardCoins: (coins: number) => void;
  setShowRewardAnimation: (show: boolean) => void;
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
  handleAnswer: (isCorrect: boolean) => void;
  handleFinalAnswer: (answer: string, userId: string) => Promise<void>;
  nextQuestion: () => void;
  previousQuestion: () => void;
  toggleJokerPanel: (show?: boolean) => void;
  toggleLeaderboard: (show?: boolean) => void;
  handleTrueFalseAnswer: (isCorrect: boolean) => void;
  handleSubquestionAnswered: (subId: number, isCorrect: boolean) => void;
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

  isSoundPlaying: boolean;
  setIsSoundPlaying: (playing: boolean) => void;
}

export const useQuizStore = create<QuizState>((set, get) => {
  // Statistik-Funktionen aus dem StatsStore
  const { incrementQuestionsAnswered, incrementCorrectAnswers, addCoins, userStats } = useUserStore.getState();

  return {
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

    // Aktionen
    fetchQuestions: async (chapterId: number) => {
      set({ isQuestionsLoading: true, questionsError: null });
      try {
        const { data, error } = await supabase
          .from('questions')
          .select('*')
          .eq('chapter_id', chapterId)
          .order('id');

        if (error) throw error;

        // Transformiere die Daten in das erwartete Format
        const validQuestions: Question[] = data.map(q => ({
          id: q.id,
          type: q.type,
          Frage: q.Frage,
          Begründung: q.Begründung,
          "Richtige Antwort": q["Richtige Antwort"],
          chapter_id: q.chapter_id,
          course_id: q.course_id || null,
          "Antwort A": q["Antwort A"] || null,
          "Antwort B": q["Antwort B"] || null,
          "Antwort C": q["Antwort C"] || null,
          "Antwort D": q["Antwort D"] || null,
          sub_questions: q.sub_questions?.map(sq => ({
            id: sq.id,
            type: sq.type,
            Frage: sq.Frage,
            Begründung: sq.Begründung,
            "Richtige Antwort": sq["Richtige Antwort"],
            chapter_id: sq.chapter_id,
            course_id: sq.course_id || null,
            "Antwort A": sq["Antwort A"] || null,
            "Antwort B": sq["Antwort B"] || null,
            "Antwort C": sq["Antwort C"] || null,
            "Antwort D": sq["Antwort D"] || null
          }))
        }));

        if (validQuestions.length === 0) {
          throw new Error('Keine gültigen Fragen gefunden');
        }

        // Lade die beantworteten Fragen für den aktuellen Benutzer
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await get().fetchAnsweredQuestions(user.id);
        }

        set({ 
          questions: validQuestions,
          currentQuestion: validQuestions[0],
          currentQuestionIndex: 0,
          totalQuestions: validQuestions.length,
          progress: 0,
          isQuestionsLoading: false,
          isQuizEnd: false,
          isQuizActive: true
        });
      } catch (error) {
        set({ 
          questionsError: error as Error,
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
    setRewardXp: (xp) => set({ rewardXp: xp }),
    setRewardCoins: (coins) => set({ rewardCoins: coins }),
    setIsAnimationPlaying: (playing) => set({ isAnimationPlaying: playing }),
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

    handleAnswer: async (isCorrect: boolean) => {
      // Sound-Lock prüfen
      if (get().isSoundPlaying) return;
      
      // Sound-Lock setzen
      set({ isSoundPlaying: true });

      // Sound abspielen
      const audio = new Audio(isCorrect ? correctSound : wrongSound);
      audio.play().catch(error => console.error('Fehler beim Abspielen des Sounds:', error));

      // Sound-Lock nach Abspielen zurücksetzen
      audio.onended = () => {
        set({ isSoundPlaying: false });
      };

      const { incrementQuestionsAnswered, incrementCorrectAnswers, addCoins } = useUserStore.getState();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      const { 
        currentQuestion,
        currentQuestionIndex,
        questions,
        roundXp,
        roundCoins,
        isAnimationPlaying,
        setIsAnimationPlaying,
        setShowRewardAnimation,
        setRewardXp,
        setRewardCoins,
        setRoundXp,
        setRoundCoins,
        setLastAnswerCorrect,
        setShowExplanation,
        setIsQuizEnd,
        setIsAnswerSubmitted,
        setIsCorrect,
        incrementLocalCorrectAnswers,
        incrementLocalWrongAnswers,
        updateStreak,
        answeredQuestions,
        isQuestionAnswered
      } = get();

      if (isAnimationPlaying || !currentQuestion) return;

      // Prüfen, ob die Frage bereits beantwortet wurde
      if (isQuestionAnswered(currentQuestion.id)) {
        // Nur den Status setzen, keine Belohnungen vergeben
        setIsAnswerSubmitted(true);
        setIsCorrect(isCorrect);
        setLastAnswerCorrect(isCorrect);
        setShowExplanation(true);
        return;
      }

      // Aktualisiere die Statistiken nur wenn die Frage noch nicht beantwortet wurde
      await incrementQuestionsAnswered(user.id);
      if (isCorrect) {
        const hasLeveledUp = await incrementCorrectAnswers(user.id);
        // 10 Münzen für richtige Antwort
        await addCoins(user.id, 10);

        // Zeige Level-Up Animation nur wenn tatsächlich ein Level-Up stattgefunden hat
        if (hasLeveledUp) {
          set({ showLevelUpAnimation: true });
        }
      } else {
        // 5 Münzen für falsche Antwort abziehen
        await addCoins(user.id, -5);
      }

      // Antwort-Status setzen
      setIsAnswerSubmitted(true);
      setIsCorrect(isCorrect);
      setLastAnswerCorrect(isCorrect);
      setShowExplanation(true);

      // Aktualisiere die beantworteten Fragen im Store
      set({ 
        answeredQuestions: [...answeredQuestions, currentQuestion.id]
      });

      // Frage als beantwortet markieren
      try {
        const userId = (await supabase.auth.getUser()).data.user?.id;
        if (userId) {
          // In der Datenbank speichern
          const { error } = await supabase
            .from('answered_questions')
            .insert({
              user_id: userId,
              question_id: currentQuestion.id,
              is_correct: isCorrect,
              answered_at: new Date().toISOString()
            });

          if (error) {
            console.error('Error saving to database:', error);
            // Bei Fehler den lokalen State wieder zurücksetzen
            set({ answeredQuestions: answeredQuestions.filter(id => id !== currentQuestion.id) });
            throw error;
          }
        }
      } catch (error) {
        console.error('Fehler beim Speichern der beantworteten Frage:', error);
      }

      // Streak und Antworten aktualisieren
      if (isCorrect) {
        incrementLocalCorrectAnswers();
        updateStreak(true);
      } else {
        incrementLocalWrongAnswers();
        updateStreak(false);
      }

      // Animation-Flag setzen
      setIsAnimationPlaying(true);
      
      // Belohnungen für die Animation setzen - nur für die Anzeige
      if (isCorrect) {
        setRoundXp(roundXp + 10);
        setRoundCoins(roundCoins + 10);
        setRewardXp(10);
        setRewardCoins(10);
      } else {
        setRoundCoins(roundCoins - 5);
        setRewardXp(0);
        setRewardCoins(-5);
      }
      setShowRewardAnimation(true);

      // Animation nach 2 Sekunden ausblenden
      setTimeout(() => {
        setShowRewardAnimation(false);
        setIsAnimationPlaying(false);

        // Prüfen, ob es die letzte Frage war
        if (currentQuestionIndex === questions.length - 1) {
          setIsQuizEnd(true);
        }
      }, 2000);
    },

    handleFinalAnswer: async (answer: string, userId: string) => {
      const {
        currentQuestion,
        isAnswerSubmitted,
        setIsAnswerSubmitted,
        setUserInputAnswer,
        setShowExplanation,
      } = get();

      if (!currentQuestion || isAnswerSubmitted) return;

      setIsAnswerSubmitted(true);
      setUserInputAnswer(answer);
      setShowExplanation(true);

      // Speichere die Antwort in der Datenbank
      const { error } = await supabase
        .from("user_answers")
        .insert({
          user_id: userId,
          question_id: currentQuestion.id,
          answer: answer,
          is_correct: false, // Wird später durch Selbstbewertung aktualisiert
        });

      if (error) {
        console.error("Fehler beim Speichern der Antwort:", error);
      }
    },

    nextQuestion: () => {
      const { currentQuestionIndex, questions, totalQuestions, setIsQuizEnd } = get();

      if (!questions || questions.length === 0) {
        console.error('Keine Fragen verfügbar');
        return;
      }

      if (currentQuestionIndex >= totalQuestions - 1) {
        console.log('Letzte Frage erreicht');
        setIsQuizEnd(true);
        return;
      }

      const nextIndex = currentQuestionIndex + 1;
      const nextQuestion = questions[nextIndex];
      
      if (!nextQuestion) {
        console.error('Nächste Frage nicht gefunden');
        return;
      }

      console.log('Gehe zur nächsten Frage:', nextIndex, nextQuestion);

      set((state) => ({
        currentQuestionIndex: nextIndex,
        currentQuestion: nextQuestion,
        isAnswerSubmitted: false,
        selectedAnswer: null,
        isCorrect: null,
        showExplanation: false,
        progress: (nextIndex / totalQuestions) * 100
      }));
    },

    previousQuestion: () => {
    const { currentQuestionIndex, questions } = get();
    if (currentQuestionIndex <= 0) return;

    const prevIndex = currentQuestionIndex - 1;
    set({
      currentQuestionIndex: prevIndex,
      currentQuestion: questions[prevIndex],
      selectedAnswer: null,
      isAnswerSubmitted: false,
      isCorrect: null,
      showExplanation: false,
      progress: (prevIndex / questions.length) * 100
    });
  },

    toggleJokerPanel: (show?: boolean) => {
      if (show !== undefined) {
        set({ showJokerPanel: show });
      } else {
        set((state) => ({ showJokerPanel: !state.showJokerPanel }));
      }
    },

    toggleLeaderboard: (show?: boolean) => {
      if (show !== undefined) {
        set({ showLeaderboard: show });
      } else {
        set((state) => ({ showLeaderboard: !state.showLeaderboard }));
      }
    },

    handleTrueFalseAnswer: async (isCorrect: boolean) => {
      const {
        currentQuestion,
        handleAnswer
      } = get();

      if (!currentQuestion) return;

      await handleAnswer(isCorrect);
  },

  handleSubquestionAnswered: async (subId: number, isCorrect: boolean) => {
    const {
      setSubQuestionResult,
      handleAnswer,
      isAnswerSubmitted
    } = get();

    // Nur setSubQuestionResult aufrufen, wenn die Antwort noch nicht gespeichert wurde
    if (!isAnswerSubmitted) {
      setSubQuestionResult(subId, isCorrect);
      await handleAnswer(isCorrect);
    }
  },

    finalizeQuiz: () => {
    set({ isQuizEnd: true });
    },

    computeXp: () => {
      // XP-Berechnung implementieren
    },

    resetQuiz: () => {
      set({
        currentQuestionIndex: 0,
        isAnswerSubmitted: false,
        selectedAnswer: null,
        isCorrect: null,
        showExplanation: false,
        isQuizEnd: false,
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
        subQuestions: [],
        subQuestionResults: {},
        isQuizActive: true,
        showNavigation: true,
        showJokerPanel: false,
        showLeaderboard: false,
        correctAnswers: 0,
        wrongAnswers: 0,
        streak: 0
      });
    },

    answeredQuestions: [],

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

    showLevelUpAnimation: false,
    setShowLevelUpAnimation: (show) => set({ showLevelUpAnimation: show }),

    isSoundPlaying: false,
    setIsSoundPlaying: (playing) => set({ isSoundPlaying: playing }),
  }
}) 