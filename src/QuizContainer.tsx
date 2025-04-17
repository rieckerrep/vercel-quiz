// QuizContainer.tsx
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { supabase } from "./lib/supabaseClient";
import QuizHeadline from "./QuizHeadline";
import JokerPanel from "./JokerPanel";
import CasesQuestion, { CasesQuestionResult } from "./CasesQuestion";
import MultipleChoiceQuestion from "./MultipleChoiceQuestion";
import DragDropQuestion from "./DragDropQuestion";
import QuestionComponent from "./QuestionComponent";
import OpenQuestion from "./OpenQuestion";
import EndScreen from "./EndScreen";
import QuestionNavigation from "./QuestionNavigation";
import { useQuizStore } from "./store/useQuizStore";
import { useSoundStore } from "./store/useSoundStore";
import LueckentextQuestion from "./LueckentextQuestion";
import { motion, AnimatePresence } from "framer-motion";
import { Database } from "./lib/supabase";
import useUserStore from './store/useUserStore'
import { authService } from "./api/authService";
import { userService } from "./api/userService";
import { quizService } from "./api/quizService";
import { Question } from "./store/useQuizStore";
import { useQuizData } from "./hooks/quiz/useQuizData";
import { User } from '@supabase/supabase-js';
import { useQuizRewards } from "./hooks/quiz/useQuizRewards";
import { SubmitAnswerResult } from './types/supabase';
import { toast } from 'react-hot-toast';
import { useProgress } from './hooks/quiz/useProgress';

type Profile = Database['public']['Tables']['profiles']['Row'];
type UserStats = Database['public']['Tables']['user_stats']['Row'];

interface QuizContainerProps {
  user: User | null;
  profile: Profile;
  userStats: UserStats;
  onOpenProfile: () => void;
  onOpenShop: () => void;
  onOpenLeaderboard: () => void;
  onOpenSettings: () => void;
}

// Typdefinitionen für die Antwortverarbeitung
interface QuestionAnswer {
  questionId: number;
  isCorrect: boolean;
}

// Typdefinitionen
interface SupabaseResponse {
  xp_awarded: number;
  coins_awarded: number;
  new_progress: number;
  streak: number;
}

export function QuizContainer({
  user,
  profile,
  onOpenProfile,
  onOpenShop,
  onOpenLeaderboard,
  onOpenSettings,
}: QuizContainerProps) {
  const chapterId = 1;
  const userId = useMemo(() => user?.id || '', [user?.id]);
  const { playCorrectSound, playWrongSound } = useSoundStore();
  const { addXp, addCoins, incrementAnsweredQuestions, incrementCorrectAnswers, fetchUserStats } = useUserStore();
  const { submitAnswer } = useQuizData(chapterId, userId);
  const { computePossibleXp } = useQuizRewards();

  // Zustand Store
  const {
    questions,
    currentQuestion,
    currentQuestionIndex,
    totalQuestions,
    isQuizActive,
    isAnswerSubmitted,
    selectedAnswer,
    isCorrect,
    showExplanation,
    isQuizEnd,
    lastAnswerCorrect,
    userInputAnswer,
    isLoading,
    showNavigation,
    showJokerPanel,
    showLeaderboard,
    progress,
    correctAnswers,
    wrongAnswers,
    streak,
    maxStreak,
    roundXp,
    roundCoins,
    possibleRoundXp,
    showRewardAnimation,
    rewardXp,
    rewardCoins,
    isAnimationPlaying,
    xpBoostUsed,
    streakBoostUsed,
    fiftyFiftyUsed,
    hintUsed,
    subQuestions,
    subQuestionResults,
    fetchQuestions,
    setCurrentQuestion,
    setCurrentQuestionIndex,
    setTotalQuestions,
    setIsQuizActive,
    setIsAnswerSubmitted,
    setSelectedAnswer,
    setIsCorrect,
    setShowNavigation,
    setShowJokerPanel,
    setShowLeaderboard,
    setProgress,
    setShowExplanation,
    setLastAnswerCorrect,
    setUserInputAnswer,
    setIsQuizEnd,
    setRoundXp,
    setRoundCoins,
    setPossibleRoundXp,
    setShowRewardAnimation,
    setRewardXp,
    setRewardCoins,
    setIsAnimationPlaying,
    setXpBoostUsed,
    setStreakBoostUsed,
    setFiftyFiftyUsed,
    setHintUsed,
    setSubQuestions,
    setSubQuestionResult,
    setIsLoading,
    incrementLocalCorrectAnswers,
    incrementLocalWrongAnswers,
    updateStreak,
    handleAnswer,
    handleFinalAnswer,
    nextQuestion,
    previousQuestion,
    toggleJokerPanel,
    toggleLeaderboard,
    handleTrueFalseAnswer,
    handleSubquestionAnswered,
    finalizeQuiz,
    computeXp,
    resetQuiz,
    answeredQuestions,
    fetchAnsweredQuestions,
    isQuestionAnswered,
    showLevelUpAnimation,
    setShowLevelUpAnimation,
    checkQuizEnd,
    calculateProgress,
    handleNavigation,
    getAnsweredQuestions,
    awardQuestion,
    awardSubquestion,
    showRewardAnimationWithSound,
    hideRewardAnimation,
    logQuizCompleted,
    initQuiz,
    setChapterId
  } = useQuizStore();

  // State für Quiz-Fortschritt und Belohnungen
  const [xpAwarded, setXpAwarded] = useState<number>(0);
  const [coinsAwarded, setCoinsAwarded] = useState<number>(0);

  const { data: progressData } = useProgress(userId, chapterId);

  // Lade Fragen beim Start
  useEffect(() => {
    const loadQuiz = async () => {
      try {
        // Setze den Quiz-Status zurück
        setChapterId(chapterId);
        await initQuiz();
        
        if (questions.length > 0) {
          setCurrentQuestion(questions[0]);
          setCurrentQuestionIndex(0);
          setTotalQuestions(questions.length);
          setIsQuizActive(true);
          setIsQuizEnd(false); // Stelle sicher, dass das Quiz nicht als beendet markiert ist
        }
      } catch (error) {
        console.error('Fehler beim Laden des Quiz:', error);
      }
    };

    loadQuiz();
  }, [chapterId, initQuiz, questions, setCurrentQuestion, setCurrentQuestionIndex, setTotalQuestions, setIsQuizActive, setIsQuizEnd, setChapterId]);

  // Berechne mögliche XP wenn Fragen geladen sind
  useEffect(() => {
    if (!isLoading && questions.length > 0) {
      computePossibleXp(questions.length, questions);
    }
  }, [questions, isLoading, computePossibleXp]);

  // Finalisiere Quiz nur wenn alle Fragen beantwortet sind
  useEffect(() => {
    if (!isQuizEnd && questions && currentQuestionIndex >= questions.length && answeredQuestions.length === questions.length) {
      finalizeQuiz();
    }
  }, [isQuizEnd, currentQuestionIndex, questions, finalizeQuiz, answeredQuestions]);

  // Aktualisiere die Benutzerdaten nur bei wichtigen Änderungen
  useEffect(() => {
    if (userId) {
      fetchUserStats();
    }
  }, [userId, roundXp, roundCoins, fetchUserStats]);

  // Ersetze die Sound-Logik in den onClick-Handlern
  const handleAnswerWithSound = async (isCorrect: boolean) => {
    if (!currentQuestion || !userId) return;
    if (isAnimationPlaying) return;
    
    try {
      // Speichere die Antwort in der Datenbank
      await submitAnswer({
        userId,
        questionId: currentQuestion.id,
        selectedOption: isCorrect ? "true" : "false",
        isCorrect,
        chapterId
      });
      
      // Verarbeite die Antwort im Store
      await handleAnswer(currentQuestion.id, isCorrect ? "true" : "false");
      await awardQuestion(currentQuestion.id, isCorrect);
      
      // Zeige die Animation mit Sound
      await showRewardAnimationWithSound(isCorrect);
    } catch (error) {
      console.error('Fehler beim Speichern der Antwort:', error);
    }
  };

  // Ersetze die Sound-Logik in den onClick-Handlern für true/false Fragen
  const handleTrueFalseWithSound = async (isTrue: boolean) => {
    if (!currentQuestion || !userId) return;
    if (isAnimationPlaying) return;

    try {
      // Speichere die Antwort
      await submitAnswer({
        userId,
        questionId: currentQuestion.id,
        selectedOption: isTrue ? "true" : "false",
        isCorrect: isTrue,
        chapterId
      });
      
      // Verarbeite die Antwort im Store
      await handleTrueFalseAnswer(currentQuestion.id, isTrue);
    } catch (error) {
      console.error('Fehler beim Speichern der Antwort:', error);
    }
  };

  // Ersetze die Sound-Logik in den onClick-Handlern für Subfragen
  const handleSubquestionWithSound = async (subId: number, isCorrect: boolean) => {
    if (!currentQuestion || !userId) return;
    if (isAnimationPlaying) return;
    
    try {
      // Verarbeite die Unterfrage
      await handleSubquestionAnswered(subId, isCorrect, currentQuestion.id);
      
      // Spiele den Sound ab
      if (isCorrect) {
        await playCorrectSound();
      } else {
        await playWrongSound();
      }
    } catch (error) {
      console.error('Fehler beim Verarbeiten der Unterfrage:', error);
    }
  };

  const calculateRoundXp = async (correctAnswers: number) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return 0;

      // Hole bereits beantwortete Fragen
      const { data: answeredQuestions } = await supabase
        .from('answered_questions')
        .select('question_id')
        .eq('user_id', session.user.id);

      const answeredQuestionIds = answeredQuestions?.map(q => q.question_id) || [];
      
      // Zähle nur neu beantwortete Fragen
      const newCorrectAnswers = correctAnswers - answeredQuestionIds.length;
      if (newCorrectAnswers <= 0) return 0;

      // Berechne XP nur für neue korrekte Antworten
      let xp = newCorrectAnswers * 10; // Basis-XP pro Frage

      // Zusätzliche XP für Fallfragen
      const caseQuestions = questions.filter(q => q.type === "cases");
      for (const question of caseQuestions) {
        if (!answeredQuestionIds.includes(question.id)) {
          const { data: subs } = await supabase
            .from("cases_subquestions")
            .select("id")
            .eq("question_id", question.id);
          if (subs) {
            xp += subs.length * 5; // 5 XP pro Unterfrage
          }
        }
      }

      return xp;
    } catch (error) {
      console.error("Fehler bei der XP-Berechnung:", error);
      return 0;
    }
  };

  const handleRoundComplete = async (correctAnswers: number) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      // Stats aktualisieren
      await incrementAnsweredQuestions();
      await incrementCorrectAnswers();
      await fetchUserStats();

    } catch (error) {
      console.error('Fehler beim Abschließen der Runde:', error);
    }
  };

  // Hilfsfunktion für UI-Updates
  const showStreakAnimation = (streak: number) => {
    // Streak-Animation anzeigen
    if (streak >= 2) { // Bei 3er Streak (2 = dritte richtige Antwort)
      showRewardAnimationWithSound(true); // Animation für korrekte Antwort
    }
  };

  // Hilfsfunktion für die Supabase-Übermittlung
  const submitToSupabase = async (questionId: number, isCorrect: boolean) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data, error } = await userService.submitAnswer(
        session.user.id,
        questionId,
        isCorrect
      );

      if (error) {
        console.error('Fehler beim Einreichen der Antwort:', error);
        return;
      }

      if (data) {
        setRoundXp(data.xp_awarded);
        setRoundCoins(data.coins_awarded);
        setProgress(data.new_progress);
      }

      // Stats aktualisieren
      await fetchUserStats();
    } catch (error) {
      console.error('Fehler beim Einreichen der Antwort:', error);
    }
  };

  // Hilfsfunktion für die Antwortverarbeitung
  const processAnswer = async (answer: string) => {
    if (!currentQuestion || !user) return;

    const isCorrect = answer === currentQuestion.correct_answer;
    setUserInputAnswer(answer);
    setIsAnswerSubmitted(true);
    setShowExplanation(true);
    setLastAnswerCorrect(isCorrect);

    try {
      // Verwende userService mit streak_boost_active Parameter
      const { data, error, success } = await userService.submitAnswer(
        user.id,
        currentQuestion.id,
        isCorrect,
        streakBoostUsed
      );

      if (!success || error) {
        throw error || new Error('Fehler beim Speichern der Antwort');
      }

      if (!data) {
        throw new Error('Keine Daten von der Datenbank erhalten');
      }

      // Update local state
      setProgress(data.new_progress);
      updateStreak(data.streak > 0);
      setXpAwarded(data.xp_awarded);
      setCoinsAwarded(data.coins_awarded);

      // Play sound and show animation
      if (isCorrect) {
        playCorrectSound();
        setShowRewardAnimation(true);
      } else {
        playWrongSound();
        hideRewardAnimation();
      }
    } catch (error) {
      console.error('Fehler beim Verarbeiten der Antwort:', error);
    }
  };

  // Modifiziere die commonProps
  const commonProps = {
    onComplete: async (isCorrect: boolean) => {
      if (isAnimationPlaying || !currentQuestion) return;
      await processAnswer(currentQuestion.correct_answer);
    }
  };

  // Rendere Loading State
  if (!user) {
    return (
      <div className="border border-gray-900 min-h-[600px] flex flex-col items-center justify-center bg-gray-50">
        <div className="w-24 h-24 mb-6 rounded-full bg-black flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
          </svg>
        </div>
        <h2 className="text-3xl font-bold mb-4">Bitte einloggen</h2>
        <p className="text-gray-600 mb-6 max-w-md text-center">Um das juristische Quiz von RieckerRep zu nutzen, musst du dich anmelden oder registrieren.</p>
        <button 
          className="px-6 py-3 bg-black text-white font-medium rounded hover:bg-gray-800"
          onClick={() => window.location.href = "/login"}
        >
          Zum Login
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="border border-gray-900 min-h-[600px] flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-black border-t-transparent rounded-full mb-4 animate-spin"></div>
          <p className="text-xl">Fragen werden geladen...</p>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return <div className="border border-gray-900 min-h-[600px] flex items-center justify-center text-xl">Keine Fragen verfügbar.</div>;
  }

  if (isQuizEnd || currentQuestionIndex >= questions.length) {
    // Berechne den Prozentsatz der erreichten XP
    const xpPercentage = possibleRoundXp > 0 ? (roundXp / possibleRoundXp) * 100 : 0;
    
    // Bestimme die Medaille basierend auf dem Prozentsatz
    let medalType = "Keine";
    if (!showRewardAnimation) {
      if (xpPercentage >= 100) {
        medalType = "Gold";
      } else if (xpPercentage >= 75) {
        medalType = "Silber";
      } else if (xpPercentage >= 50) {
        medalType = "Bronze";
      }

      // Speichere die Medaille in der Datenbank
      const saveMedal = async () => {
        if (!user?.id || medalType === "Keine") return;

        try {
          // Hole aktuelle Medaillen-Statistik
          const { data: currentStats } = await supabase
            .from('user_stats')
            .select('gold_medals, silver_medals, bronze_medals')
            .eq('user_id', user.id)
            .single();

          if (!currentStats) return;

          // Update je nach Medaillentyp
          const updates: { 
            gold_medals?: number, 
            silver_medals?: number, 
            bronze_medals?: number 
          } = {};

          if (medalType === "Gold") {
            updates.gold_medals = (currentStats.gold_medals || 0) + 1;
          } else if (medalType === "Silber") {
            updates.silver_medals = (currentStats.silver_medals || 0) + 1;
          } else if (medalType === "Bronze") {
            updates.bronze_medals = (currentStats.bronze_medals || 0) + 1;
          }

          // Aktualisiere die Datenbank
          const { error } = await supabase
            .from('user_stats')
            .update(updates)
            .eq('user_id', user.id);

          if (error) {
            console.error('Fehler beim Speichern der Medaille:', error);
          }
        } catch (error) {
          console.error('Fehler beim Speichern der Medaille:', error);
        }
      };

      // Rufe die Funktion auf
      saveMedal();
    }

    return (
      <EndScreen
        roundXp={roundXp}
        roundCoins={roundCoins}
        possibleRoundXp={possibleRoundXp} 
        medalType={medalType}
        showLevelUpAnimation={showLevelUpAnimation}
        correctAnswers={correctAnswers}
        onRestart={() => {
          setCurrentQuestionIndex(0);
          setIsQuizEnd(false);
          setRoundXp(0);
          setRoundCoins(0);
          setXpBoostUsed(false);
          setStreakBoostUsed(false);
          setFiftyFiftyUsed(false);
          setHintUsed(false);
          setShowLevelUpAnimation(false);
          // Setze alle anderen relevanten States zurück
          setIsAnswerSubmitted(false);
          setSelectedAnswer(null);
          setIsCorrect(null);
          setShowExplanation(false);
          setLastAnswerCorrect(null);
          setUserInputAnswer("");
          setProgress(0);
          // Stelle sicher, dass die erste Frage geladen wird
          if (questions && questions.length > 0) {
            setCurrentQuestion(questions[0]);
          }
        }}
        onOpenLeaderboard={onOpenLeaderboard}
        onOpenShop={onOpenShop}
        onOpenProfile={onOpenProfile}
      />
    );
  }

  const renderQuestion = () => {
    if (!currentQuestion) return null;

    switch (currentQuestion.type) {
      case "lueckentext":
        return (
          <LueckentextQuestion
            {...commonProps}
            questionText={currentQuestion.Frage || ""}
            correctAnswer={currentQuestion["Richtige Antwort"] || ""}
            hint={hintUsed ? currentQuestion.Begründung || "" : null}
          />
        );
      case "true_false":
        return (
          <div className="flex gap-2">
            <button
              onClick={async () => {
                if (isAnimationPlaying || !currentQuestion) return;
                await processAnswer(currentQuestion.correct_answer);
              }}
              className="answer-button flex-1 inline-flex items-center justify-center"
              disabled={isAnimationPlaying}
            >
              Richtig
            </button>
            <button
              onClick={async () => {
                if (isAnimationPlaying || !currentQuestion) return;
                await processAnswer(currentQuestion.correct_answer);
              }}
              className="answer-button flex-1 inline-flex items-center justify-center"
              disabled={isAnimationPlaying}
            >
              Falsch
            </button>
          </div>
        );
      case "question":
        return (
          <QuestionComponent
            question={{
              ...currentQuestion,
              chapter_id: currentQuestion.chapter_id ?? 1,
              "Frage": currentQuestion.Frage || currentQuestion.question_text,
              "Antwort A": currentQuestion["Antwort A"] || undefined,
              "Antwort B": currentQuestion["Antwort B"] || undefined,
              "Antwort C": currentQuestion["Antwort C"] || undefined,
              "Antwort D": currentQuestion["Antwort D"] || undefined,
              "Richtige Antwort": currentQuestion["Richtige Antwort"] || currentQuestion.correct_answer,
              "Begründung": currentQuestion.Begründung || (currentQuestion.explanation === null ? undefined : currentQuestion.explanation)
            }}
            onAnswer={async (selected: string) => {
              if (isAnimationPlaying) return;
              
              // Überprüfe die Antwort
              const isCorrect = selected.trim().toLowerCase() === 
                (currentQuestion["Richtige Antwort"] || currentQuestion.correct_answer || "").trim().toLowerCase();
              
              // Verarbeite die Antwort zuerst
              await processAnswer(selected);
              await awardQuestion(currentQuestion.id, isCorrect);
              
              // Spiele den Sound nur einmal ab, nachdem die Antwort verarbeitet wurde
              if (isCorrect) {
                playCorrectSound();
              } else {
                playWrongSound();
              }
            }}
          />
        );
      case "multiple_choice":
        return (
          <MultipleChoiceQuestion
            questionId={currentQuestion.id}
            onComplete={async (isCorrect: boolean) => {
              if (isAnimationPlaying || !currentQuestion) return;
              await processAnswer(currentQuestion.correct_answer);
            }}
          />
        );
      case "drag_drop":
        return (
          <DragDropQuestion
            questionId={currentQuestion.id}
            onComplete={async (isCorrect: boolean) => {
              if (isAnimationPlaying || !currentQuestion) return;
              await processAnswer(currentQuestion.correct_answer);
            }}
          />
        );
      case "cases":
        return (
          <CasesQuestion
            question={currentQuestion}
            onSubquestionAnswered={async (subId: number, isCorrect: boolean) => {
              if (isAnimationPlaying) return;
              await handleSubquestionWithSound(subId, isCorrect);
            }}
            onComplete={async (result: CasesQuestionResult) => {
              if (isAnimationPlaying) return;
              setCurrentQuestionIndex(currentQuestionIndex + 1);
              setShowExplanation(false);
              setLastAnswerCorrect(null);
              setUserInputAnswer("");
              setIsAnswerSubmitted(false);
            }}
          />
        );
      case "open_question":
        return (
          <>
            {/* Frage im linken Bereich */}
            <div className="text-xl md:text-2xl font-bold mt-4 md:mt-8 leading-relaxed">
              {currentQuestion.question_text || currentQuestion.Frage || ""}
            </div>
            
            {/* Erklärungscontainer wird hier angezeigt, wenn showExplanation true ist */}
            {showExplanation && (
              <div className="mt-4 md:mt-8 p-3 md:p-5 bg-gray-800 rounded-md border border-yellow-400">
                <div className="text-white">
                  <h3 className="text-lg md:text-xl font-bold mb-2">Vergleiche deine Antwort:</h3>
                  <div className="mb-3">
                    <h4 className="font-semibold">Deine Antwort:</h4>
                    <div className="p-2 bg-gray-700 rounded mt-1">
                      {userInputAnswer || <em className="text-gray-400">Keine Antwort</em>}
                    </div>
                  </div>
                  <div className="mb-3">
                    <h4 className="font-semibold">Musterlösung:</h4>
                    <div className="p-2 bg-gray-700 rounded mt-1">
                      {currentQuestion["Richtige Antwort"] || currentQuestion.correct_answer || ""}
                    </div>
                  </div>
                  
                  {/* Bewertungsbuttons */}
                  <div className="mt-4">
                    <p className="mb-2 font-medium">Wie bewertest du deine Antwort?</p>
                    <div className="flex flex-col md:flex-row justify-between gap-2 md:gap-4">
                      <div className="flex gap-2 md:gap-3">
                        <button
                          className={`flex-1 md:flex-none py-2 px-4 md:px-6 rounded font-medium transition-colors flex items-center justify-center gap-2 ${
                            lastAnswerCorrect === true
                              ? "bg-green-500 text-white"
                              : "bg-gray-700 hover:bg-green-500 text-white"
                          }`}
                          onClick={async () => {
                            if (isAnimationPlaying || !currentQuestion) return;
                            await processAnswer(currentQuestion.correct_answer);
                          }}
                          disabled={lastAnswerCorrect !== null || isAnimationPlaying}
                        >
                          <div className="w-5 h-5 md:w-6 md:h-6 bg-green-500 rounded-full flex items-center justify-center">
                            <svg className="w-3 h-3 md:w-4 md:h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <span className="text-sm md:text-base">Richtig</span>
                        </button>
                        <button
                          className={`flex-1 md:flex-none py-2 px-4 md:px-6 rounded font-medium transition-colors flex items-center justify-center gap-2 ${
                            lastAnswerCorrect === false
                              ? "bg-red-500 text-white"
                              : "bg-gray-700 hover:bg-red-500 text-white"
                          }`}
                          onClick={async () => {
                            if (isAnimationPlaying || !currentQuestion) return;
                            await processAnswer(currentQuestion.correct_answer);
                          }}
                          disabled={lastAnswerCorrect !== null || isAnimationPlaying}
                        >
                          <div className="w-5 h-5 md:w-6 md:h-6 bg-red-500 rounded-full flex items-center justify-center">
                            <svg className="w-3 h-3 md:w-4 md:h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </div>
                          <span className="text-sm md:text-base">Falsch</span>
                        </button>
                      </div>
                      
                      {/* Weiter-Button in der gleichen Reihe auf Mobile */}
                      {lastAnswerCorrect !== null && (
                        <button 
                          onClick={nextQuestion}
                          disabled={isAnimationPlaying}
                          className={`flex-1 md:flex-none py-2 px-4 md:px-6 font-medium rounded transition-colors flex items-center justify-center gap-2 ${
                            isAnimationPlaying 
                              ? "bg-gray-400 text-gray-700 cursor-not-allowed" 
                              : "bg-yellow-400 text-black hover:bg-yellow-500"
                          }`}
                        >
                          <span className="text-sm md:text-base">Weiter</span>
                          <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        );
      default:
        return (
          <div className="p-3 text-red-500">
            Fragetyp "{currentQuestion.type}" wird nicht unterstützt.
          </div>
        );
    }
  };

  // Berechne den Fortschritt für die Fortschrittsanzeige
  const progressPercentage = questions 
    ? ((currentQuestionIndex + 1) / questions.length) * 100
    : 0;

  return (
    <div className="border-2 border-gray-900 rounded-sm shadow-lg overflow-hidden relative min-h-[600px]">
      {/* Kopfzeile mit Benutzerinfo und Statistiken */}
      <div className="flex flex-col h-full relative">
        <QuizHeadline 
          user={user}
          profile={profile || { username: null, avatar_url: null }}
          onOpenProfile={onOpenProfile}
          onOpenShop={onOpenShop}
          onOpenSettings={onOpenSettings}
          onOpenLeaderboard={onOpenLeaderboard}
          roundXp={roundXp}
          roundCoins={roundCoins}
        />
        <div className="flex-1 overflow-auto">
          {/* Fragen-Navigation */}
          <div className="border-t-2 border-b-2 border-gray-300">
            <QuestionNavigation
              questions={questions}
              userId={user.id}
              currentIndex={currentQuestionIndex}
              onSelectQuestion={(idx: number) => {
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
              }}
            />
          </div>

          {/* Inhalt: 2-spaltig mit schwarzem und weißem Bereich */}
          <div className="flex flex-col md:flex-row">
            {/* Linke Spalte - Schwarzer Bereich mit Frage */}
            <div className="w-full md:w-[60%] bg-black text-white p-4 md:p-8 relative min-h-[300px] md:min-h-[600px] md:border-r-2 border-gray-400">
              <div className="mb-6 md:mb-12">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-4 mb-4 md:mb-6">
                  <div className="text-lg md:text-xl font-bold whitespace-nowrap">
                    Frage {currentQuestionIndex + 1} von {questions?.length || 8}
                  </div>
                  
                  {/* Fortschrittsbalken */}
                  <div className="w-full h-2 md:h-3 bg-gray-900 border border-yellow-400 md:border-2 flex-grow rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-yellow-400"
                      style={{ width: `${progressPercentage}%` }}
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPercentage}%` }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                    ></motion.div>
                  </div>
                </div>
                
                <div className="text-xl md:text-2xl font-bold mt-4 md:mt-8 leading-relaxed">
                  {currentQuestion?.Frage || currentQuestion?.question_text || ""}
                </div>

                {/* Toast Container */}
                <div id="toast-container" className="absolute bottom-4 left-4 right-4" style={{ zIndex: 1000 }} />
                
                {/* Erklärungscontainer für reguläre Fragen */}
                {showExplanation && currentQuestion && currentQuestion.type !== "open_question" && (
                  <div className="mt-4 md:mt-8 p-3 md:p-5 bg-gray-800 rounded-md border border-yellow-400">
                    <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
                      {lastAnswerCorrect ? (
                        <div className="w-6 h-6 md:w-8 md:h-8 bg-green-500 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 md:w-5 md:h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      ) : (
                        <div className="w-6 h-6 md:w-8 md:h-8 bg-red-500 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 md:w-5 md:h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </div>
                      )}
                      <h3 className="text-lg md:text-xl font-bold text-white">
                        {lastAnswerCorrect ? "Richtig!" : "Leider falsch"}
                      </h3>
                    </div>
                    
                    <div className="text-white text-sm md:text-base">
                      {currentQuestion.type === 'true_false' ? (
                        <>
                          <p className="mb-2 md:mb-3">
                            <span className="font-semibold">Richtige Antwort:</span>{" "}
                            {["true", "wahr", "1", "ja", "richtig"].includes(
                              (currentQuestion["Richtige Antwort"] || currentQuestion.correct_answer || "").toLowerCase().trim()
                            ) ? "Richtig" : "Falsch"}
                          </p>
                          {currentQuestion.Begründung && (
                            <div>
                              <span className="font-semibold">Begründung:</span>
                              <p className="mt-1 md:mt-2">{currentQuestion.Begründung}</p>
                            </div>
                          )}
                        </>
                      ) : currentQuestion.type === 'drag_drop' ? (
                        <>
                          {useQuizStore.getState().correctDragDropAnswer && (
                            <div>
                              <span className="font-semibold">Richtige Zuordnung:</span>
                              <pre className="mt-1 md:mt-2 whitespace-pre-wrap font-sans bg-gray-700 p-3 rounded">
                                {useQuizStore.getState().correctDragDropAnswer}
                              </pre>
                            </div>
                          )}
                          {currentQuestion.Begründung && (
                            <div className="mt-3">
                              <span className="font-semibold">Begründung:</span>
                              <p className="mt-1 md:mt-2">{currentQuestion.Begründung}</p>
                            </div>
                          )}
                        </>
                      ) : currentQuestion.type === 'multiple_choice' ? (
                        <>
                          {useQuizStore.getState().correctMultipleChoiceAnswer && (
                            <div>
                              <span className="font-semibold">Richtige Antworten:</span>
                              <pre className="mt-1 md:mt-2 whitespace-pre-wrap font-sans bg-gray-700 p-3 rounded">
                                {useQuizStore.getState().correctMultipleChoiceAnswer}
                              </pre>
                            </div>
                          )}
                          {currentQuestion.Begründung && (
                            <div className="mt-3">
                              <span className="font-semibold">Begründung:</span>
                              <p className="mt-1 md:mt-2">{currentQuestion.Begründung}</p>
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <p className="mb-2 md:mb-3">
                            <span className="font-semibold">Richtige Antwort:</span> {currentQuestion["Richtige Antwort"] || currentQuestion.correct_answer || ""}
                          </p>
                          {currentQuestion.Begründung && (
                            <div>
                              <span className="font-semibold">Begründung:</span>
                              <p className="mt-1 md:mt-2">{currentQuestion.Begründung}</p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                    
                    {/* Weiter-Button */}
                    <div className="mt-4 md:mt-6 flex justify-end">
                      <button 
                        onClick={nextQuestion}
                        disabled={isAnimationPlaying}
                        className={`px-4 md:px-6 py-2 font-medium rounded transition-colors ${
                          isAnimationPlaying 
                            ? "bg-gray-400 text-gray-700 cursor-not-allowed" 
                            : "bg-yellow-400 text-black hover:bg-yellow-500"
                        }`}
                      >
                        Weiter
                      </button>
                    </div>
                  </div>
                )}

                {/* Vergleichscontainer für OpenQuestion */}
                {showExplanation && currentQuestion && currentQuestion.type === "open_question" && (
                  <div className="mt-4 md:mt-8 p-3 md:p-5 bg-gray-800 rounded-md border border-yellow-400 overflow-y-auto max-h-[300px] md:max-h-[450px]">
                    <h3 className="text-base md:text-lg font-bold mb-2 md:mb-3 text-white">Vergleiche deine Antwort:</h3>
                    
                    <div className="mb-3 md:mb-4">
                      <h4 className="font-semibold text-white text-sm md:text-base">Deine Antwort:</h4>
                      <div className="p-2 md:p-3 bg-gray-700 border border-gray-600 rounded mt-1 text-white text-sm md:text-base">
                        {userInputAnswer || <em className="text-gray-400">Keine Antwort</em>}
                      </div>
                    </div>
                    
                    <div className="mb-3 md:mb-4">
                      <h4 className="font-semibold text-white text-sm md:text-base">Musterlösung:</h4>
                      <div className="p-2 md:p-3 bg-gray-700 border border-gray-600 rounded mt-1 text-white text-sm md:text-base">
                        {currentQuestion["Richtige Antwort"] || <em className="text-gray-400">Keine Musterlösung verfügbar</em>}
                      </div>
                    </div>
                    
                    <div className="mt-4 md:mt-5">
                      <p className="mb-2 font-medium text-white text-sm md:text-base">Wie bewertest du deine Antwort?</p>
                      <div className="flex flex-col md:flex-row justify-between gap-2 md:gap-4">
                        <div className="flex gap-2 md:gap-3">
                          <button
                            className={`flex-1 md:flex-none py-2 px-4 md:px-6 rounded font-medium transition-colors flex items-center justify-center gap-2 ${
                              lastAnswerCorrect === true
                                ? "bg-green-500 text-white"
                                : "bg-gray-700 hover:bg-green-500 text-white"
                            }`}
                            onClick={async () => {
                              if (isAnimationPlaying || !currentQuestion) return;
                              await processAnswer(currentQuestion.correct_answer);
                            }}
                            disabled={lastAnswerCorrect !== null || isAnimationPlaying}
                          >
                            <div className="w-5 h-5 md:w-6 md:h-6 bg-green-500 rounded-full flex items-center justify-center">
                              <svg className="w-3 h-3 md:w-4 md:h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                            <span className="text-sm md:text-base">Richtig</span>
                          </button>
                          <button
                            className={`flex-1 md:flex-none py-2 px-4 md:px-6 rounded font-medium transition-colors flex items-center justify-center gap-2 ${
                              lastAnswerCorrect === false
                                ? "bg-red-500 text-white"
                                : "bg-gray-700 hover:bg-red-500 text-white"
                            }`}
                            onClick={async () => {
                              if (isAnimationPlaying || !currentQuestion) return;
                              await processAnswer(currentQuestion.correct_answer);
                            }}
                            disabled={lastAnswerCorrect !== null || isAnimationPlaying}
                          >
                            <div className="w-5 h-5 md:w-6 md:h-6 bg-red-500 rounded-full flex items-center justify-center">
                              <svg className="w-3 h-3 md:w-4 md:h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </div>
                            <span className="text-sm md:text-base">Falsch</span>
                          </button>
                        </div>
                        
                        {/* Weiter-Button in der gleichen Reihe auf Mobile */}
                        {lastAnswerCorrect !== null && (
                          <button 
                            onClick={nextQuestion}
                            disabled={isAnimationPlaying}
                            className={`flex-1 md:flex-none py-2 px-4 md:px-6 font-medium rounded transition-colors flex items-center justify-center gap-2 ${
                              isAnimationPlaying 
                                ? "bg-gray-400 text-gray-700 cursor-not-allowed" 
                                : "bg-yellow-400 text-black hover:bg-yellow-500"
                            }`}
                          >
                            <span className="text-sm md:text-base">Weiter</span>
                            <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Rechte Spalte - Weißer Bereich mit Antworten */}
            <div className="w-full md:w-[40%] bg-white p-4 md:p-8 flex flex-col items-center justify-start pt-8 md:pt-16 relative min-h-[300px] md:min-h-[600px]">
              {/* Container für den Hauptinhalt */}
              <div className="w-full mb-8 md:mb-16">
                {currentQuestion?.type === "open_question" ? (
                  <div className="w-full">
                    <OpenQuestion
                      questionText=""
                      correctAnswer={currentQuestion.correct_answer || currentQuestion["Richtige Antwort"] || ""}
                      onCompareAnswer={(text) => {
                        if (isAnimationPlaying) return;
                        handleFinalAnswer(currentQuestion.id, text);
                      }}
                      onSelfEvaluation={async (isCorrect) => {
                        if (isAnimationPlaying) return;
                        
                        // Verarbeite die Antwort
                        await processAnswer(currentQuestion.correct_answer);
                        await awardQuestion(currentQuestion.id, isCorrect);
                        
                        // Zeige die Animation mit Sound
                        await showRewardAnimationWithSound(isCorrect);
                      }}
                      displayInBlackArea={false}
                    />
                  </div>
                ) : currentQuestion?.type === "true_false" ? (
                  <div className="w-full flex flex-col gap-4 md:gap-6">
                    <button
                      onClick={async () => {
                        if (isAnimationPlaying || !currentQuestion) return;
                        await processAnswer(currentQuestion.correct_answer);
                      }}
                      className="w-full py-4 md:py-5 px-4 md:px-6 border-2 border-black text-black bg-white text-center font-medium text-base md:text-lg rounded-md md:rounded-none hover:bg-gray-100 transition-colors"
                      disabled={showExplanation || isAnimationPlaying}
                    >
                      Richtig
                    </button>
                    <button
                      onClick={async () => {
                        if (isAnimationPlaying || !currentQuestion) return;
                        await processAnswer(currentQuestion.correct_answer);
                      }}
                      className="w-full py-4 md:py-5 px-4 md:px-6 border-2 border-black text-black bg-white text-center font-medium text-base md:text-lg rounded-md md:rounded-none hover:bg-gray-100 transition-colors"
                      disabled={showExplanation || isAnimationPlaying}
                    >
                      Falsch
                    </button>
                  </div>
                ) : (
                  <div className="w-full">{renderQuestion()}</div>
                )}
              </div>
              
              {/* Joker im unteren Bereich */}
              <div className="fixed md:absolute right-2 bottom-8 md:bottom-10 md:left-1/2 md:right-auto md:-translate-x-1/2 flex justify-center">
                <JokerPanel 
                  xpBoostUsed={xpBoostUsed}
                  streakBoostUsed={streakBoostUsed}
                  hintUsed={hintUsed}
                  fiftyFiftyUsed={fiftyFiftyUsed}
                  handleXpBoostClick={toggleJokerPanel}
                  handleStreakBoostClick={toggleJokerPanel}
                  handleHintClick={toggleJokerPanel}
                  handleFiftyFiftyClick={toggleJokerPanel}
                  disabled={showExplanation}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {progressData && (
        <div className="progress-overview">
          <h3>Dein Fortschritt</h3>
          <div className="progress-stats">
            <p>
              Beantwortet: {progressData.filter(p => p.is_answered).length} / {progressData.length}
            </p>
            <p>
              Richtig: {progressData.filter(p => p.is_correct).length} / {progressData.length}
            </p>
          </div>
          <div className="progress-bars">
            {progressData.map((item, index) => (
              <div 
                key={`progress-${item.question_id}-${index}`}
                className={`progress-bar ${item.is_answered ? (item.is_correct ? 'correct' : 'wrong') : 'unanswered'}`}
                title={`Frage ${item.question_id}: ${item.is_answered ? (item.is_correct ? 'Richtig' : 'Falsch') : 'Noch nicht beantwortet'}`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}