// QuizContainer.tsx
import { useEffect } from "react";
import { useQuestions } from "./useQuestions";
import { supabase } from "./supabaseClient";
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
import { useQuizAwards } from "./useQuizAwards";
import { useUserStats } from "./useUserStats";
import RewardAnimation from "./RewardAnimation";
import LueckentextQuestion from "./LueckentextQuestion";
import { motion } from "framer-motion";
import { Database } from "./types/supabase";
import { useUserStore } from "./store/useUserStore";

type Profile = Database['public']['Tables']['profiles']['Row'];
type UserStats = Database['public']['Tables']['user_stats']['Row'];

interface QuizContainerProps {
  user: any; // Auth user type from Supabase
  profile: Profile;
  userStats: UserStats;
  onOpenProfile: () => void;
  onOpenShop: () => void;
  onOpenLeaderboard: () => void;
  onOpenSettings: () => void;
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
  const { playCorrectSound, playWrongSound } = useSoundStore();
  const { awardQuestion: awardNormal } = useQuizAwards(user.id);
  const { userStats: globalUserStats, updateUserStats } = useUserStats(user.id);
  const { addXP, addCoins, incrementQuestionsAnswered, incrementCorrectAnswers, fetchUserStats } = useUserStore();

  // Zustand Store
  const {
    questions,
    currentQuestion,
    currentQuestionIndex,
    isAnswerSubmitted,
    selectedAnswer,
    showExplanation,
    lastAnswerCorrect,
    userInputAnswer,
    isQuizEnd,
    showNavigation,
    showJokerPanel,
    showLeaderboard,
    progress,
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
    isLoading,
    isQuestionsLoading,
    questionsError,
    fetchQuestions,
    setCurrentQuestionIndex,
    setProgress,
    setShowExplanation,
    setLastAnswerCorrect,
    setUserInputAnswer,
    setIsAnswerSubmitted,
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
    handleAnswer,
    handleFinalAnswer,
    nextQuestion,
    previousQuestion,
    toggleJokerPanel,
    toggleLeaderboard,
    handleTrueFalseAnswer,
    handleSubquestionAnswered,
    finalizeQuiz,
    resetQuiz,
    showLevelUpAnimation,
    setShowLevelUpAnimation,
  } = useQuizStore();

  // Lade Fragen beim ersten Rendern
  useEffect(() => {
    if (chapterId) {
      fetchQuestions(chapterId);
    }
  }, [chapterId, fetchQuestions]);

  // Berechne mögliche XP
  useEffect(() => {
    async function computeXp() {
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
    }
    computeXp();
  }, [questions, setPossibleRoundXp]);

  // Finalisiere Quiz wenn alle Fragen beantwortet
  useEffect(() => {
    if (!isQuizEnd && questions && currentQuestionIndex >= questions.length) {
      finalizeQuiz();
    }
  }, [isQuizEnd, currentQuestionIndex, questions, finalizeQuiz]);

  // Aktualisiere die Benutzerdaten, wenn sich XP oder Münzen ändern
  useEffect(() => {
    if (user?.id) {
      fetchUserStats(user.id);
    }
  }, [user?.id, roundXp, roundCoins, fetchUserStats]);

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

  if (isQuestionsLoading || isLoading) {
    return (
      <div className="border border-gray-900 min-h-[600px] flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-black border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-xl">Fragen werden geladen...</p>
        </div>
      </div>
    );
  }

  if (questionsError) {
    return (
      <div className="border border-gray-900 min-h-[600px] flex items-center justify-center text-xl text-red-500">
        Fehler beim Laden der Fragen: {questionsError.message}
      </div>
    );
  }

  if (!questions || questions.length === 0) {
    return <div className="border border-gray-900 min-h-[600px] flex items-center justify-center text-xl">Keine Fragen verfügbar.</div>;
  }

  if (possibleRoundXp === 0) {
    return <div className="border border-gray-900 min-h-[600px] flex items-center justify-center text-xl">Berechne mögliche XP...</div>;
  }

  if (isQuizEnd || currentQuestionIndex >= questions.length) {
    return (
      <EndScreen
        roundXp={roundXp}
        roundCoins={roundCoins}
        possibleRoundXp={possibleRoundXp} 
        medalType={showRewardAnimation ? "Keine" : "Gold"}
        showLevelUpAnimation={showLevelUpAnimation}
        onRestart={() => {
          previousQuestion();
          setIsQuizEnd(false);
          setRoundXp(0);
          setRoundCoins(0);
          setXpBoostUsed(false);
          setStreakBoostUsed(false);
          setFiftyFiftyUsed(false);
          setHintUsed(false);
          setShowLevelUpAnimation(false);
        }}
        onOpenLeaderboard={onOpenLeaderboard}
        onOpenShop={onOpenShop}
        onOpenProfile={onOpenProfile}
      />
    );
  }

  let content: React.ReactNode = null;
  if (!currentQuestion) {
    content = <div>Keine Frage verfügbar</div>;
  } else {
    switch (currentQuestion.type) {
      case "true_false":
        content = (
          <div className="flex gap-2">
            <button
              onClick={async () => {
                if (isAnimationPlaying) return;
                await handleTrueFalseAnswer(true);
                if (lastAnswerCorrect) {
                  await playCorrectSound();
                } else {
                  await playWrongSound();
                }
              }}
              className="answer-button flex-1 inline-flex items-center justify-center"
              disabled={isAnimationPlaying}
            >
              Richtig
            </button>
            <button
              onClick={async () => {
                if (isAnimationPlaying) return;
                await handleTrueFalseAnswer(false);
                if (lastAnswerCorrect) {
                  await playCorrectSound();
                } else {
                  await playWrongSound();
                }
              }}
              className="answer-button flex-1 inline-flex items-center justify-center"
              disabled={isAnimationPlaying}
            >
              Falsch
            </button>
          </div>
        );
        break;
      case "question":
        content = (
          <QuestionComponent
            question={{ ...currentQuestion, chapter_id: currentQuestion.chapter_id ?? 1 }}
            onAnswer={async (_selected: string, isCorrect: boolean) => {
              if (isAnimationPlaying) return;
              
              await handleAnswer(isCorrect);
              
              if (isCorrect) {
                await playCorrectSound();
              } else {
                await playWrongSound();
              }
            }}
          />
        );
        break;
      case "multiple_choice":
        content = (
          <MultipleChoiceQuestion
            questionId={currentQuestion.id}
            onComplete={async (isCorrect: boolean) => {
              if (isAnimationPlaying) return;
              await handleAnswer(isCorrect);
              if (isCorrect) {
                await playCorrectSound();
              } else {
                await playWrongSound();
              }
            }}
          />
        );
        break;
      case "drag_drop":
        content = (
          <DragDropQuestion
            questionId={currentQuestion.id}
            onComplete={async (isCorrect: boolean) => {
              if (isAnimationPlaying) return;
              await handleAnswer(isCorrect);
              if (isCorrect) {
                await playCorrectSound();
              } else {
                await playWrongSound();
              }
            }}
          />
        );
        break;
      case "cases":
        content = (
          <CasesQuestion
            question={currentQuestion}
            onSubquestionAnswered={async (subId: number, isCorrect: boolean) => {
              if (isAnimationPlaying) return;
              await handleSubquestionAnswered(subId, isCorrect);
              if (isCorrect) {
                await playCorrectSound();
              } else {
                await playWrongSound();
              }
            }}
            onComplete={async (result: CasesQuestionResult) => {
              if (isAnimationPlaying) return;
              await handleAnswer(result.overallCorrect);
              nextQuestion();
            }}
          />
        );
        break;
      case "open_question":
        content = (
          <OpenQuestion
            questionText=""
            correctAnswer={currentQuestion["Richtige Antwort"] || ""}
            onCompareAnswer={(text) => {
              if (isAnimationPlaying) return;
              handleFinalAnswer(text, user.id);
            }}
            onSelfEvaluation={async (isCorrect) => {
              if (isAnimationPlaying) return;
              await handleAnswer(isCorrect);
            }}
            displayInBlackArea={false}
          />
        );
        break;
      case "lueckentext":
        content = (
            <LueckentextQuestion
              questionText=""
            correctAnswer={currentQuestion["Richtige Antwort"] ?? ""}
            hint={currentQuestion.Begründung}
              onComplete={async (isCorrect) => {
                if (isAnimationPlaying) return;
              await handleAnswer(isCorrect);
                if (isCorrect) {
                await playCorrectSound();
                } else {
                await playWrongSound();
                }
              }}
            />
          );
          break;
        default:
          content = (
            <div className="p-3 text-red-500">
            Fragetyp "{currentQuestion.type}" wird nicht unterstützt.
            </div>
          );
      }
    }

  // Berechne den Fortschritt für die Fortschrittsanzeige
  const progressPercentage = questions 
    ? ((currentQuestionIndex + 1) / questions.length) * 100
    : 0;

  return (
    <div className="border-2 border-gray-900 rounded-sm shadow-lg overflow-hidden relative">
      {/* Kombinierte Belohnungs- und Richtig/Falsch-Animation */}
      {showRewardAnimation && (
        <div className="fixed md:absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1.2, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ duration: 0.5, ease: "backOut" }}
            className="flex flex-col items-center gap-4"
          >
            {/* Richtig/Falsch Icon */}
            {lastAnswerCorrect === true ? (
              <div className="w-16 h-16 md:w-24 md:h-24 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                <svg className="w-10 h-10 md:w-16 md:h-16 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            ) : (
              <div className="w-16 h-16 md:w-24 md:h-24 bg-red-500 rounded-full flex items-center justify-center shadow-lg">
                <svg className="w-10 h-10 md:w-16 md:h-16 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            )}

            {/* Rewards */}
            {lastAnswerCorrect && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex flex-col items-center gap-2 bg-white/90 backdrop-blur-sm p-3 rounded-lg shadow-lg"
              >
                {rewardXp > 0 && (
                  <div className="flex items-center gap-2 text-lg md:text-xl font-bold text-yellow-500">
                    <span className="text-xl md:text-2xl">⭐</span>
                    +{rewardXp} XP
                  </div>
                )}
                {rewardCoins > 0 && (
                  <div className="flex items-center gap-2 text-lg md:text-xl font-bold text-yellow-500">
                    <span className="text-xl md:text-2xl">🪙</span>
                    +{rewardCoins} Münzen
                  </div>
                )}
              </motion.div>
            )}
          </motion.div>
        </div>
      )}
      
      {/* Kopfzeile mit Benutzerinfo und Statistiken */}
      <div className="flex flex-col h-full">
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
                  {currentQuestion?.Frage}
                </div>
                
                {/* Erklärungscontainer für reguläre Fragen */}
                {showExplanation && currentQuestion && currentQuestion.type !== "open_question" && (
                  <div className="mt-4 md:mt-8 p-3 md:p-5 bg-gray-800 rounded-md border border-yellow-400">
                    <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
                      {lastAnswerCorrect === true ? (
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
                        {lastAnswerCorrect === true ? "Richtig!" : "Leider falsch"}
                      </h3>
                    </div>
                    
                    <div className="text-white text-sm md:text-base">
                      <p className="mb-2 md:mb-3">
                        <span className="font-semibold">Richtige Antwort:</span> {currentQuestion["Richtige Antwort"]}
                      </p>
                      {currentQuestion.Begründung && (
                        <div>
                          <span className="font-semibold">Begründung:</span>
                          <p className="mt-1 md:mt-2">{currentQuestion.Begründung}</p>
                        </div>
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
                      <div className="flex flex-col md:flex-row justify-between gap-2 md:gap-0">
                        <div className="flex gap-2 md:gap-3">
                          <button
                            className={`py-2 px-4 md:px-6 rounded font-medium transition-colors flex items-center gap-2 ${
                              lastAnswerCorrect === true
                                ? "bg-green-500 text-white"
                                : "bg-gray-700 hover:bg-green-500 text-white"
                            }`}
                            onClick={async () => {
                              if (lastAnswerCorrect === null) {
                                await handleAnswer(true);
                              }
                            }}
                            disabled={lastAnswerCorrect !== null}
                          >
                            <div className="w-5 h-5 md:w-6 md:h-6 bg-green-500 rounded-full flex items-center justify-center">
                              <svg className="w-3 h-3 md:w-4 md:h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                            <span className="text-sm md:text-base">Richtig</span>
                          </button>
                          <button
                            className={`py-2 px-4 md:px-6 rounded font-medium transition-colors flex items-center gap-2 ${
                              lastAnswerCorrect === false
                                ? "bg-red-500 text-white"
                                : "bg-gray-700 hover:bg-red-500 text-white"
                            }`}
                            onClick={async () => {
                              if (lastAnswerCorrect === null) {
                                await handleAnswer(false);
                              }
                            }}
                            disabled={lastAnswerCorrect !== null}
                          >
                            <div className="w-5 h-5 md:w-6 md:h-6 bg-red-500 rounded-full flex items-center justify-center">
                              <svg className="w-3 h-3 md:w-4 md:h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </div>
                            <span className="text-sm md:text-base">Falsch</span>
                          </button>
                        </div>
                        
                        {/* Weiter-Button für OpenQuestion */}
                        {lastAnswerCorrect !== null && (
                          <button 
                            onClick={nextQuestion}
                            disabled={isAnimationPlaying}
                            className={`w-full md:w-auto mt-2 md:mt-0 px-4 md:px-6 py-2 font-medium rounded transition-colors ${
                              isAnimationPlaying 
                                ? "bg-gray-400 text-gray-700 cursor-not-allowed" 
                                : "bg-yellow-400 text-black hover:bg-yellow-500"
                            }`}
                          >
                            Weiter
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
                  <div className="w-full">{content}</div>
                ) : currentQuestion?.type === "true_false" ? (
                  <div className="w-full flex flex-col gap-4 md:gap-6">
                    <button
                      onClick={async () => {
                        await handleTrueFalseAnswer(true);
                      }}
                      className="w-full py-4 md:py-5 px-4 md:px-6 border-2 border-black text-black bg-white text-center font-medium text-base md:text-lg rounded-md md:rounded-none hover:bg-gray-100 transition-colors"
                    >
                      Richtig
                    </button>
                    <button
                      onClick={async () => {
                        await handleTrueFalseAnswer(false);
                      }}
                      className="w-full py-4 md:py-5 px-4 md:px-6 border-2 border-black text-black bg-white text-center font-medium text-base md:text-lg rounded-md md:rounded-none hover:bg-gray-100 transition-colors"
                    >
                      Falsch
                    </button>
                  </div>
                ) : (
                  <div className="w-full">{content}</div>
                )}
              </div>
              
              {/* Joker im unteren Bereich */}
              <div className="fixed md:absolute right-2 bottom-8 md:bottom-10 md:left-1/2 md:right-auto md:-translate-x-1/2 flex justify-center">
                <JokerPanel 
                  xpBoostUsed={xpBoostUsed}
                  streakBoostUsed={streakBoostUsed}
                  hintUsed={hintUsed}
                  fiftyFiftyUsed={fiftyFiftyUsed}
                  handleXpBoostClick={() => toggleJokerPanel(true)}
                  handleStreakBoostClick={() => toggleJokerPanel(true)}
                  handleHintClick={() => toggleJokerPanel(true)}
                  handleFiftyFiftyClick={() => toggleJokerPanel(true)}
                  disabled={showExplanation}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Level-Up Animation */}
      {showLevelUpAnimation && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          className="fixed inset-0 flex items-center justify-center z-50"
        >
          <div className="bg-black bg-opacity-50 absolute inset-0" />
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="bg-white rounded-lg p-8 relative z-10 text-center"
          >
            <h2 className="text-2xl font-bold text-green-600 mb-4">Level Up!</h2>
            <p className="text-gray-700">Glückwunsch! Du hast ein neues Level erreicht!</p>
            <button
              onClick={() => setShowLevelUpAnimation(false)}
              className="mt-4 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition-colors"
            >
              Weiter
            </button>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}

export default QuizContainer;