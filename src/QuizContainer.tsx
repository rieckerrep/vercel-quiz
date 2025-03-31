// QuizContainer.tsx
import React, { useEffect, useState, useCallback } from "react";
import { useQuestions } from "./useQuestions";
import { supabase } from "./supabaseClient";
import { useQueryClient } from "@tanstack/react-query";
import QuizHeadline from "./QuizHeadline";
import JokerPanel from "./JokerPanel";
import CasesQuestion, { CasesQuestionResult } from "./CasesQuestion";
import MultipleChoiceQuestion from "./MultipleChoiceQuestion";
import DragDropQuestion from "./DragDropQuestion";
import QuestionComponent from "./QuestionComponent";
import OpenQuestion from "./OpenQuestion";
import EndScreen from "./EndScreen";
import QuestionNavigation from "./QuestionNavigation";
import { useQuiz } from "./QuizContext";
import { useQuizAwards } from "./useQuizAwards";
import { useUserStats } from "./useUserStats";
import RewardAnimation from "./RewardAnimation";
import LueckentextQuestion from "./LueckentextQuestion";
import { motion } from "framer-motion";
import { Database } from "./types/supabase";

type Profile = Database['public']['Tables']['profiles']['Row'];
type UserStats = Database['public']['Tables']['user_stats']['Row'];

interface QuizContainerProps {
  user: any; // Auth user type from Supabase
  profile: Profile;
  userStats: UserStats;
  onOpenProfile: () => void;
  onOpenShop: () => void;
  onOpenLeaderboard: () => void;
}

export function QuizContainer({
  user,
  onOpenProfile,
  onOpenShop,
  onOpenLeaderboard,
}: QuizContainerProps) {
  const chapterId = 1;
  const { data: questions, isLoading: questionsLoading } =
    useQuestions(chapterId);

  const [showExplanation, setShowExplanation] = useState(false);
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState<boolean | null>(null);
  const [userInputAnswer, setUserInputAnswer] = useState("");
  const [isQuizEnd, setIsQuizEnd] = useState(false);
  const [medalType, setMedalType] = useState("Keine");

  const {
    currentIndex,
    setCurrentIndex,
    roundXp,
    setRoundXp,
    roundCoins,
    setRoundCoins,
    possibleRoundXp,
    setPossibleRoundXp,
  } = useQuiz();

  const [xpBoostUsed, setXpBoostUsed] = useState(false);
  const [streakBoostUsed, setStreakBoostUsed] = useState(false);
  const [fiftyFiftyUsed, setFiftyFiftyUsed] = useState(false);
  const [hintUsed, setHintUsed] = useState(false);
  
  // Zustände für die Belohnungsanimation
  const [showRewardAnimation, setShowRewardAnimation] = useState(false);
  const [rewardXp, setRewardXp] = useState(0);
  const [rewardCoins, setRewardCoins] = useState(0);
  const [isAnimationPlaying, setIsAnimationPlaying] = useState(false);

  const { awardQuestion: awardNormal, awardSubquestion } = useQuizAwards(
    user.id
  );
  const { userStats: globalUserStats, updateUserStats } = useUserStats(user.id);

  // currentQ muss vor der Verwendung deklariert werden
  const currentQ = questions?.[currentIndex];
  
  const queryClient = useQueryClient();
  
  // Stelle sicher, dass alle useEffect-Aufrufe immer vorhanden sind, 
  // nicht nur abhängig vom Fragetyp
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

  useEffect(() => {
    if (!isQuizEnd && questions && currentIndex >= questions.length) {
      finalizeQuiz();
    }
  }, [isQuizEnd, currentIndex, questions]);

  // Extra leerer useEffect, um die Hook-Reihenfolge zu stabilisieren
  useEffect(() => {
    // Dieser Hook ist immer vorhanden, macht aber nichts
  }, []);
  
  // Extrahiere die Logik aus dem switch-case in Funktionen
  const handleTrueFalseAnswer = useCallback(async (opt: boolean) => {
    if (!currentQ || isAnimationPlaying) return; // Verhindern doppelter Ausführung während Animation läuft
    
    // Hier prüfen wir, ob die richtige Antwort existiert und vergleichen sie mit der gewählten Option
    const correctAnswer = currentQ["Richtige Antwort"] || "";
    
    // Debug-Ausgaben
    console.log("Debug - Fragetyp:", currentQ.type);
    console.log("Debug - Richtige Antwort aus DB:", correctAnswer);
    console.log("Debug - Gewählte Option:", opt);
    
    // Vergleiche die Antwort
    const isC = (correctAnswer.trim().toLowerCase() === "richtig") === opt;
    console.log("Debug - Ist korrekt?", isC);
    
    const didAward = await awardNormal(currentQ.id, isC);
    if (didAward && globalUserStats) {
      const xpDelta = isC ? 10 : 0;
      const coinDelta = isC ? 1 : -1;
      setRoundXp((prev) => prev + xpDelta);
      setRoundCoins((prev) => Math.max(0, prev + coinDelta));
      
      // Animation-Flag setzen, um mehrfache Auslösung zu verhindern
      setIsAnimationPlaying(true);
      
      // Belohnungsanimation auslösen
      setRewardXp(isC ? xpDelta : 0);
      setRewardCoins(isC ? coinDelta : 0);
      setShowRewardAnimation(true);
      setLastAnswerCorrect(isC);
      
      // Animation nach 2 Sekunden ausblenden und Flag zurücksetzen
      setTimeout(() => {
        setShowRewardAnimation(false);
        setIsAnimationPlaying(false);
      }, 2000);
      
      await updateUserStats({
        total_xp: (globalUserStats.total_xp ?? 0) + xpDelta,
        total_coins: (globalUserStats.total_coins ?? 0) + coinDelta,
      });
    } else {
      // Auch wenn keine Belohnung vergeben wurde (z.B. weil die Frage bereits beantwortet wurde),
      // setzen wir trotzdem den Status basierend auf der Korrektheit
      setLastAnswerCorrect(isC);
    }
    setShowExplanation(true);
  }, [currentQ, awardNormal, globalUserStats, setRoundXp, setRoundCoins, setRewardXp, setRewardCoins, setShowRewardAnimation, setLastAnswerCorrect, updateUserStats, setShowExplanation, isAnimationPlaying]);

  function finalizeQuiz() {
    const ratio = possibleRoundXp > 0 ? roundXp / possibleRoundXp : 0;
    let newMedal = "Keine";
    if (ratio >= 1.0) newMedal = "Gold";
    else if (ratio >= 0.75) newMedal = "Silber";
    else if (ratio >= 0.5) newMedal = "Bronze";
    setMedalType(newMedal);
    setIsQuizEnd(true);
  }

  async function handleSubquestionAnswered(subId: number, isCorrect: boolean) {
    if (!questions) return;
    const didAward = await awardSubquestion(
      subId,
      isCorrect,
      questions[currentIndex].id
    );
    if (didAward && globalUserStats) {
      const xpDelta = isCorrect ? 10 : 0;
      const coinDelta = isCorrect ? 1 : -1;
      setRoundXp((prev) => prev + xpDelta);
      setRoundCoins((prev) => Math.max(0, prev + coinDelta));
      await updateUserStats({
        total_xp: (globalUserStats.total_xp ?? 0) + xpDelta,
        total_coins: (globalUserStats.total_coins ?? 0) + coinDelta,
      });
    }
  }

  function handleNext() {
    // Wenn eine Animation läuft, ignoriere den Klick
    if (isAnimationPlaying) return;
    
    setShowExplanation(false);
    setLastAnswerCorrect(null);
    setUserInputAnswer("");
    setCurrentIndex(currentIndex + 1);
  }

  // Invalidate userStats query when values change
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['userStats'] });
  }, [roundXp, roundCoins, queryClient]);

  const handleAnswer = async (isCorrect: boolean) => {
    // Verhindern doppelter Ausführung während Animation läuft
    if (isAnimationPlaying) return;
    
    console.log("QuizContainer - Von DragDropQuestion erhaltener isCorrect-Wert:", isCorrect);
    
    setLastAnswerCorrect(isCorrect);
    setShowExplanation(true);
    
    if (!currentQ) return; // Sicherheitscheck für currentQ
    
    const didAward = await awardNormal(currentQ.id, isCorrect);
    if (didAward && globalUserStats) {
      // Animation-Flag setzen, um mehrfache Auslösung zu verhindern
      setIsAnimationPlaying(true);
      
      const xpDelta = isCorrect ? 10 : 0;
      const coinDelta = isCorrect ? 1 : -1;
      setRoundXp((prev) => prev + xpDelta);
      setRoundCoins((prev) => Math.max(0, prev + coinDelta));
      
      // Belohnungsanimation auslösen
      setRewardXp(isCorrect ? xpDelta : 0);
      setRewardCoins(isCorrect ? coinDelta : 0);
      setShowRewardAnimation(true);
      
      // Animation nach 2 Sekunden ausblenden und Flag zurücksetzen
      setTimeout(() => {
        setShowRewardAnimation(false);
        setIsAnimationPlaying(false);
      }, 2000);
      
      await updateUserStats({
        total_xp: (globalUserStats.total_xp ?? 0) + xpDelta,
        total_coins: (globalUserStats.total_coins ?? 0) + coinDelta,
      });
    }
  };

  if (!user)
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
  if (questionsLoading)
    return (
      <div className="border border-gray-900 min-h-[600px] flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-black border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-xl">Fragen werden geladen...</p>
        </div>
      </div>
    );
  if (!questions || questions.length === 0)
    return <div className="border border-gray-900 min-h-[600px] flex items-center justify-center text-xl">Keine Fragen verfügbar.</div>;
  if (possibleRoundXp === 0)
    return <div className="border border-gray-900 min-h-[600px] flex items-center justify-center text-xl">Berechne mögliche XP...</div>;
  if (isQuizEnd || currentIndex >= questions.length)
    return (
      <EndScreen
        roundXp={roundXp}
        roundCoins={roundCoins}
        possibleRoundXp={possibleRoundXp} 
        medalType={medalType}
        onRestart={() => {
          setCurrentIndex(0);
          setIsQuizEnd(false);
          setRoundXp(0);
          setRoundCoins(0);
          setXpBoostUsed(false);
          setStreakBoostUsed(false);
          setFiftyFiftyUsed(false);
          setHintUsed(false);
        }}
        onOpenLeaderboard={onOpenLeaderboard}
        onOpenShop={onOpenShop}
        onOpenProfile={onOpenProfile}
      />
    );

  let content: React.ReactNode = null;
  if (!currentQ) {
    content = <div>Keine Frage verfügbar</div>;
  } else {
    switch (currentQ.type) {
      case "true_false":
        content = (
          <div className="flex gap-2">
            <button
              onClick={async () => {
                await handleTrueFalseAnswer(true);
              }}
              className="answer-button flex-1 inline-flex items-center justify-center"
            >
              Richtig
            </button>
            <button
              onClick={async () => {
                await handleTrueFalseAnswer(false);
              }}
              className="answer-button flex-1 inline-flex items-center justify-center"
            >
              Falsch
            </button>
          </div>
        );
        break;
      case "question":
        content = (
          <QuestionComponent
            question={{ ...currentQ, chapter_id: currentQ.chapter_id ?? 1 }}
            onAnswer={async (_selected: string, isCorrect: boolean) => {
              // Verhindern doppelter Ausführung während Animation läuft
              if (isAnimationPlaying) return;
              
              console.log("QuizContainer - Von QuestionComponent erhaltener isCorrect-Wert:", isCorrect);
              
              setLastAnswerCorrect(isCorrect);
              setShowExplanation(true);
              
              const didAward = await awardNormal(currentQ.id, isCorrect);
              if (didAward && globalUserStats) {
                setIsAnimationPlaying(true);
                
                const xpDelta = isCorrect ? 10 : 0;
                const coinDelta = isCorrect ? 1 : -1;
                setRoundXp((prev) => prev + xpDelta);
                setRoundCoins((prev) => Math.max(0, prev + coinDelta));
                
                setRewardXp(isCorrect ? xpDelta : 0);
                setRewardCoins(isCorrect ? coinDelta : 0);
                setShowRewardAnimation(true);
                
                setTimeout(() => {
                  setShowRewardAnimation(false);
                  setIsAnimationPlaying(false);
                }, 2000);
                
                await updateUserStats({
                  total_xp: (globalUserStats.total_xp ?? 0) + xpDelta,
                  total_coins: (globalUserStats.total_coins ?? 0) + coinDelta,
                });
              }
            }}
          />
        );
        break;
      case "multiple_choice":
        content = (
          <MultipleChoiceQuestion
            questionId={currentQ.id}
            questionText={currentQ.Frage}
            onComplete={async (isCorrect) => {
                // Verhindern doppelter Ausführung während Animation läuft
                if (isAnimationPlaying) return;
                
                // Hier NICHT handleTrueFalseAnswer verwenden, sondern die gleiche Logik direkt implementieren
                console.log("QuizContainer - Von MultipleChoiceQuestion erhaltener isCorrect-Wert:", isCorrect);
                
                setLastAnswerCorrect(isCorrect);
                setShowExplanation(true);
                
                const didAward = await awardNormal(currentQ.id, isCorrect);
                if (didAward && globalUserStats) {
                  // Animation-Flag setzen, um mehrfache Auslösung zu verhindern
                  setIsAnimationPlaying(true);
                  
                  const xpDelta = isCorrect ? 10 : 0;
                  const coinDelta = isCorrect ? 1 : -1;
                  setRoundXp((prev) => prev + xpDelta);
                  setRoundCoins((prev) => Math.max(0, prev + coinDelta));
                  
                  // Belohnungsanimation auslösen
                  setRewardXp(isCorrect ? xpDelta : 0);
                  setRewardCoins(isCorrect ? coinDelta : 0);
                  setShowRewardAnimation(true);
                  
                  // Animation nach 2 Sekunden ausblenden und Flag zurücksetzen
                  setTimeout(() => {
                    setShowRewardAnimation(false);
                    setIsAnimationPlaying(false);
                  }, 2000);
                  
                  await updateUserStats({
                    total_xp: (globalUserStats.total_xp ?? 0) + xpDelta,
                    total_coins: (globalUserStats.total_coins ?? 0) + coinDelta,
                  });
                }
            }}
          />
        );
        break;
      case "drag_drop":
        content = (
          <DragDropQuestion
            questionId={currentQ.id}
            onComplete={handleAnswer}
          />
        );
        break;
      case "cases":
        content = (
          <CasesQuestion
            question={currentQ}
            onSubquestionAnswered={handleSubquestionAnswered}
            onComplete={async (result: CasesQuestionResult) => {
              await supabase.from("answered_questions").insert([
                {
                  user_id: user.id,
                  question_id: currentQ.id,
                  is_correct: result.overallCorrect,
                  answered_at: new Date(),
                },
              ]);
              setLastAnswerCorrect(result.overallCorrect);
              setShowExplanation(false);
              handleNext();
            }}
          />
        );
        break;
      case "open_question":
        content = (
          <OpenQuestion
            questionText=""
            correctAnswer={currentQ["Richtige Antwort"] || ""}
            onCompareAnswer={(text) => {
              setUserInputAnswer(text);
              setShowExplanation(true);
            }}
            onSelfEvaluation={async (isCorrect) => {
              // Verhindern doppelter Ausführung während Animation läuft
              if (isAnimationPlaying) return;
              
              const didAward = await awardNormal(currentQ.id, isCorrect);
              if (didAward && globalUserStats) {
                // Animation-Flag setzen, um mehrfache Auslösung zu verhindern
                setIsAnimationPlaying(true);
                
                const xpDelta = isCorrect ? 10 : 0;
                const coinDelta = isCorrect ? 1 : -1;
                setRoundXp((prev) => prev + xpDelta);
                setRoundCoins((prev) => Math.max(0, prev + coinDelta));
                
                // Belohnungsanimation auslösen
                if (isCorrect) {
                  setRewardXp(xpDelta);
                  setRewardCoins(coinDelta);
                  setShowRewardAnimation(true);
                  setLastAnswerCorrect(true);
                  
                  // Animation nach 2 Sekunden ausblenden und Flag zurücksetzen
                  setTimeout(() => {
                    setShowRewardAnimation(false);
                    setIsAnimationPlaying(false);
                  }, 2000);
                } else {
                  setLastAnswerCorrect(false);
                  setShowRewardAnimation(true);
                  setRewardXp(0);
                  setRewardCoins(0);
                  
                  // Animation nach 2 Sekunden ausblenden und Flag zurücksetzen
                  setTimeout(() => {
                    setShowRewardAnimation(false);
                    setIsAnimationPlaying(false);
                  }, 2000);
                }
                
                await updateUserStats({
                  total_xp: (globalUserStats.total_xp ?? 0) + xpDelta,
                  total_coins: (globalUserStats.total_coins ?? 0) + coinDelta,
                });
              }
            }}
            displayInBlackArea={false} // Wichtig: Nicht in OpenQuestion anzeigen
          />
        );
        break;
      case "lueckentext":
        content = (
            <LueckentextQuestion
              questionText=""
              correctAnswer={currentQ["Richtige Antwort"] ?? ""}
              hint={currentQ.Begründung}
              onComplete={async (isCorrect) => {
                // Verhindern doppelter Ausführung während Animation läuft
                if (isAnimationPlaying) return;
                
                console.log("LueckentextQuestion onComplete mit isCorrect:", isCorrect);
                
                // Zuerst Datenbank aktualisieren und prüfen, ob die Frage bereits beantwortet wurde
                const didAward = await awardNormal(currentQ.id, isCorrect);
                console.log("didAward Ergebnis:", didAward);
                
                // Status immer basierend auf dem tatsächlichen isCorrect-Wert setzen,
                // unabhängig davon, ob die Frage bereits beantwortet wurde
                setLastAnswerCorrect(isCorrect);
                setShowExplanation(true);
                
                // Nur wenn didAward true ist (Frage war noch nicht beantwortet), zeigen wir Animation und berechnen XP
                if (didAward && globalUserStats) {
                  // Animation-Flag setzen, um mehrfache Auslösung zu verhindern
                  setIsAnimationPlaying(true);
                  
                  setShowRewardAnimation(true);
                  
                  // XP und Coins basierend auf Korrektheit berechnen
                  const xpDelta = isCorrect ? 10 : 0;
                  const coinDelta = isCorrect ? 1 : -1;
                  
                  // Belohnungsanimation mit korrekten Werten anzeigen - 
                  // Bei falschen Antworten nur 0 Punkte anzeigen, nicht negative Werte
                  setRewardXp(isCorrect ? xpDelta : 0);
                  setRewardCoins(isCorrect ? coinDelta : 0);
                  
                  // Animation nach 2 Sekunden ausblenden und Flag zurücksetzen
                  setTimeout(() => {
                    setShowRewardAnimation(false);
                    setIsAnimationPlaying(false);
                  }, 2000);
                  
                  // Statistiken aktualisieren - tatsächliche Werte werden berechnet
                  setRoundXp((prev) => prev + xpDelta);
                  setRoundCoins((prev) => Math.max(0, prev + coinDelta));
                  
                  await updateUserStats({
                    total_xp: (globalUserStats.total_xp ?? 0) + xpDelta,
                    total_coins: (globalUserStats.total_coins ?? 0) + coinDelta,
                  });
                }
              }}
            />
          );
          break;
        default:
          content = (
            <div className="p-3 text-red-500">
                Fragetyp "{currentQ.type}" wird nicht unterstützt.
            </div>
          );
      }
    }

  // Berechne den Fortschritt für die Fortschrittsanzeige
  const progressPercentage = questions 
    ? ((currentIndex + 1) / questions.length) * 100
    : 0;

  return (
    <div className="border-2 border-gray-900 rounded-sm shadow-lg overflow-hidden relative">
      {/* Belohnungsanimation am oberen Rand in der Nähe der Headline */}
      <RewardAnimation 
        xp={rewardXp} 
        coins={rewardCoins} 
        isCorrect={lastAnswerCorrect === true}
        isVisible={showRewardAnimation} 
        position="headline"
      />
      
      {/* Richtig/Falsch Animation in der Mitte des Containers */}
      {showRewardAnimation && (
        <div className="absolute top-[75%] left-[80%] transform -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1.2, opacity: 1, rotate: [0, -5, 5, -5, 0] }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ duration: 0.5, ease: "backOut" }}
          >
            {lastAnswerCorrect ? (
              <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center">
                <svg className="w-16 h-16 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            ) : (
              <div className="w-24 h-24 bg-red-500 rounded-full flex items-center justify-center">
                <svg className="w-16 h-16 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            )}
          </motion.div>
        </div>
      )}
      
      {/* Kopfzeile mit Benutzerinfo und Statistiken */}
      <QuizHeadline
        onOpenProfile={onOpenProfile}
        onOpenShop={onOpenShop}
        onOpenLeaderboard={onOpenLeaderboard}
        roundCoins={roundCoins}
      />

      {/* Fragen-Navigation */}
      <div className="border-t-2 border-b-2 border-gray-300">
        <QuestionNavigation
          questions={questions}
          userId={user.id}
          currentIndex={currentIndex}
          onSelectQuestion={(idx: number) => {
            setCurrentIndex(idx);
            setShowExplanation(false);
            setLastAnswerCorrect(null);
            setUserInputAnswer("");
          }}
        />
      </div>

      {/* Inhalt: 2-spaltig mit schwarzem und weißem Bereich */}
      <div className="flex">
        {/* Linke Spalte - Schwarzer Bereich mit Frage */}
        <div className="w-[60%] bg-black text-white p-8 relative min-h-[600px] border-r-2 border-gray-400">
          <div className="mb-12">
            <div className="flex items-center gap-4 mb-6">
              <div className="text-xl font-bold whitespace-nowrap">
                Frage {currentIndex + 1} von {questions?.length || 8}
              </div>
              
              {/* Fortschrittsbalken */}
              <div className="w-full h-3 bg-black border-2 border-yellow-400 flex-grow rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-yellow-400"
                  style={{ width: `${progressPercentage}%` }}
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercentage}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                ></motion.div>
              </div>
            </div>
            
            <div className="text-2xl font-bold mt-8 leading-relaxed">
              {currentQ?.Frage}
            </div>
            
            {/* Erklärungscontainer für reguläre Fragen */}
            {showExplanation && currentQ && currentQ.type !== "open_question" && (
              <div className="mt-8 p-5 bg-gray-800 rounded-md border border-yellow-400">
                <div className="flex items-center gap-3 mb-3">
                  {lastAnswerCorrect === true ? (
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  ) : (
                    <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                  )}
                  <h3 className="text-xl font-bold text-white">
                    {lastAnswerCorrect === true ? "Richtig!" : "Leider falsch"}
                  </h3>
                </div>
                
                <div className="text-white">
                  <p className="mb-3">
                    <span className="font-semibold">Richtige Antwort:</span> {currentQ["Richtige Antwort"]}
                  </p>
                  {currentQ.Begründung && (
                    <div>
                      <span className="font-semibold">Begründung:</span>
                      <p className="mt-2">{currentQ.Begründung}</p>
                    </div>
                  )}
                </div>
                
                {/* Weiter-Button hinzufügen - während Animation deaktiviert */}
                <div className="mt-6 flex justify-end">
                  <button 
                    onClick={handleNext}
                    disabled={isAnimationPlaying}
                    className={`px-6 py-2 font-medium rounded transition-colors ${
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
            {showExplanation && currentQ && currentQ.type === "open_question" && (
              <div className="mt-8 p-5 bg-gray-800 rounded-md border border-yellow-400 overflow-y-auto max-h-[450px]">
                <h3 className="text-lg font-bold mb-3 text-white">Vergleiche deine Antwort:</h3>
                
                <div className="mb-4">
                  <h4 className="font-semibold text-white">Deine Antwort:</h4>
                  <div className="p-3 bg-gray-700 border border-gray-600 rounded mt-1 text-white">
                    {userInputAnswer || <em className="text-gray-400">Keine Antwort</em>}
                  </div>
                </div>
                
                <div className="mb-4">
                  <h4 className="font-semibold text-white">Musterlösung:</h4>
                  <div className="p-3 bg-gray-700 border border-gray-600 rounded mt-1 text-white">
                    {currentQ["Richtige Antwort"] || <em className="text-gray-400">Keine Musterlösung verfügbar</em>}
                  </div>
                </div>
                
                <div className="mt-5">
                  <p className="mb-2 font-medium text-white">Wie bewertest du deine Antwort?</p>
                  <div className="flex justify-between">
                    <div className="flex gap-3">
                      <button
                        className={`py-2 px-6 rounded font-medium transition-colors flex items-center gap-2 ${
                          lastAnswerCorrect === true
                            ? "bg-green-500 text-white"
                            : "bg-gray-700 hover:bg-green-500 text-white"
                        }`}
                        onClick={async () => {
                          if (lastAnswerCorrect === null) {
                            console.log("OpenQuestion - Antwort als richtig bewertet");
                            setLastAnswerCorrect(true);
                            
                            // Direkt wie bei anderen Komponenten die Bewertung durchführen
                            const didAward = await awardNormal(currentQ.id, true);
                            if (didAward && globalUserStats) {
                              const xpDelta = 10;
                              const coinDelta = 1;
                              setRoundXp((prev) => prev + xpDelta);
                              setRoundCoins((prev) => Math.max(0, prev + coinDelta));
                              
                              // Belohnungsanimation auslösen
                              setRewardXp(xpDelta);
                              setRewardCoins(coinDelta);
                              setShowRewardAnimation(true);
                              
                              // Animation nach 2 Sekunden ausblenden
                              setTimeout(() => {
                                setShowRewardAnimation(false);
                              }, 2000);
                              
                              await updateUserStats({
                                total_xp: (globalUserStats.total_xp ?? 0) + xpDelta,
                                total_coins: (globalUserStats.total_coins ?? 0) + coinDelta,
                              });
                            }
                          }
                        }}
                        disabled={lastAnswerCorrect !== null}
                      >
                        <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <span>Richtig</span>
                      </button>
                      <button
                        className={`py-2 px-6 rounded font-medium transition-colors flex items-center gap-2 ${
                          lastAnswerCorrect === false
                            ? "bg-red-500 text-white"
                            : "bg-gray-700 hover:bg-red-500 text-white"
                        }`}
                        onClick={async () => {
                          if (lastAnswerCorrect === null) {
                            console.log("OpenQuestion - Antwort als falsch bewertet");
                            setLastAnswerCorrect(false);
                            
                            // Direkt wie bei anderen Komponenten die Bewertung durchführen
                            const didAward = await awardNormal(currentQ.id, false);
                            if (didAward && globalUserStats) {
                              const xpDelta = 0;
                              const coinDelta = -1;
                              setRoundXp((prev) => prev + xpDelta);
                              setRoundCoins((prev) => Math.max(0, prev + coinDelta));
                              
                              // Belohnungsanimation auslösen
                              setRewardXp(xpDelta);
                              setRewardCoins(coinDelta);
                              setShowRewardAnimation(true);
                              
                              // Animation nach 2 Sekunden ausblenden
                              setTimeout(() => {
                                setShowRewardAnimation(false);
                              }, 2000);
                              
                              await updateUserStats({
                                total_xp: (globalUserStats.total_xp ?? 0) + xpDelta,
                                total_coins: (globalUserStats.total_coins ?? 0) + coinDelta,
                              });
                            }
                          }
                        }}
                        disabled={lastAnswerCorrect !== null}
                      >
                        <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </div>
                        <span>Falsch</span>
                      </button>
                    </div>
                    
                    {/* Weiter-Button für OpenQuestion */}
                    {lastAnswerCorrect !== null && (
                      <button 
                        onClick={handleNext}
                        disabled={isAnimationPlaying}
                        className={`px-6 py-2 font-medium rounded transition-colors ${
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
        <div className="w-[40%] bg-white p-8 flex flex-col items-center justify-start pt-16 relative min-h-[600px]">
          {/* Container für den Hauptinhalt, der den Raum für die Joker am unteren Rand lässt */}
          <div className="w-full mb-24">
            {currentQ?.type === "open_question" ? (
              // Nur die Eingabe für offene Fragen im weißen Bereich
              <div className="w-full">{content}</div>
            ) : currentQ?.type === "true_false" ? (
              <div className="w-full flex flex-col gap-6">
                <button
                  onClick={async () => {
                    await handleTrueFalseAnswer(true);
                  }}
                  className="w-full py-5 px-6 border-2 border-black text-black bg-white text-center font-medium text-lg rounded-none hover:bg-gray-100 transition-colors"
                >
                  Richtig
                </button>
                <button
                  onClick={async () => {
                    await handleTrueFalseAnswer(false);
                  }}
                  className="w-full py-5 px-6 border-2 border-black text-black bg-white text-center font-medium text-lg rounded-none hover:bg-gray-100 transition-colors"
                >
                  Falsch
                </button>
              </div>
            ) : (
              <div className="w-full">{content}</div>
            )}
          </div>
          
          {/* Joker im unteren Bereich der weißen Seite */}
          <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2">
            <JokerPanel 
              xpBoostUsed={xpBoostUsed}
              streakBoostUsed={streakBoostUsed}
              hintUsed={hintUsed}
              fiftyFiftyUsed={fiftyFiftyUsed}
              handleXpBoostClick={() => setXpBoostUsed(true)}
              handleStreakBoostClick={() => setStreakBoostUsed(true)}
              handleHintClick={() => setHintUsed(true)}
              handleFiftyFiftyClick={() => setFiftyFiftyUsed(true)}
              disabled={showExplanation}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default QuizContainer;
