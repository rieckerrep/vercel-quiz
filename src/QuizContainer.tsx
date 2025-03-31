// QuizContainer.tsx
import { useEffect, useState, useCallback } from "react";
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
import { useQuiz } from "./QuizContext";
import { useQuizAwards } from "./useQuizAwards";
import { useUserStats } from "./useUserStats";
import RewardAnimation from "./RewardAnimation";
import LueckentextQuestion from "./LueckentextQuestion";
import { motion } from "framer-motion";
import { Database } from "./types/supabase";

// Sound-Effekte importieren
import correctSoundFile from "./assets/sounds/correct.mp3";
import wrongSoundFile from "./assets/sounds/wrong.mp3";

// Sound-Effekte
const correctSound = new Audio(correctSoundFile);
const wrongSound = new Audio(wrongSoundFile);

// Sound-Hilfsfunktion
const playSound = async (sound: HTMLAudioElement) => {
  try {
    // Stoppe und setze alle Sounds zurück
    [correctSound, wrongSound].forEach(s => {
      s.pause();
      s.currentTime = 0;
    });
    
    // Spiele den gewünschten Sound
    await sound.play();
  } catch (error) {
    console.log("Sound konnte nicht abgespielt werden:", error);
  }
};

type Profile = Database['public']['Tables']['profiles']['Row'];
type UserStats = Database['public']['Tables']['user_stats']['Row'];

interface Question {
  id: number;
  type: string;
  Frage: string;
  Begründung?: string;
  "Richtige Antwort": string;
  chapter_id: number;
}

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
  const { data: questions, isLoading: questionsLoading } = useQuestions(chapterId);

  const [showExplanation, setShowExplanation] = useState(false);
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState<boolean | null>(null);
  const [userInputAnswer, setUserInputAnswer] = useState("");
  const [isQuizEnd, setIsQuizEnd] = useState(false);
  const [medalType, setMedalType] = useState("Keine");
  const [selectedAnswer, setSelectedAnswer] = useState<string>("");
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);

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
    if (!currentQ || isAnimationPlaying) return;
    
    const correctAnswer = currentQ["Richtige Antwort"] || "";
    const isC = (correctAnswer.trim().toLowerCase() === "richtig") === opt;
    
    // Sound abspielen
    if (isC) {
      await playSound(correctSound);
    } else {
      await playSound(wrongSound);
    }
    
    const didAward = await awardNormal(currentQ.id, isC);
    if (didAward && globalUserStats) {
      // Belohnungen berechnen
      const rewardXp = isC ? 10 : 0;
      const rewardCoins = isC ? 10 : -5; // 10 Münzen für richtig, -5 für falsch
      setRoundXp(prev => prev + rewardXp);
      setRoundCoins(prev => prev + rewardCoins);
      
      // Animation-Flag setzen, um mehrfache Auslösung zu verhindern
      setIsAnimationPlaying(true);
      
      // Belohnungsanimation auslösen
      setRewardXp(rewardXp);
      setRewardCoins(rewardCoins);
      setShowRewardAnimation(true);
      setLastAnswerCorrect(isC);
      
      // Animation nach 2 Sekunden ausblenden und Flag zurücksetzen
      setTimeout(() => {
        setShowRewardAnimation(false);
        setIsAnimationPlaying(false);
      }, 2000);
      
      // Statistiken aktualisieren
      if (user) {
        const { data: existingStats } = await supabase
          .from('user_stats')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (existingStats) {
          const { error: updateError } = await supabase
            .from('user_stats')
            .update({
              total_xp: (existingStats.total_xp || 0) + rewardXp,
              total_coins: Math.max(0, (existingStats.total_coins || 0) + rewardCoins), // Verhindert negative Münzen
              questions_answered: (existingStats.questions_answered || 0) + 1,
              correct_answers: existingStats.correct_answers + (isC ? 1 : 0),
              last_played: new Date().toISOString()
            })
            .eq('user_id', user.id);

          if (updateError) {
            console.error('Fehler beim Aktualisieren der Statistiken:', updateError);
          }
        }
      }
    } else {
      // Auch wenn keine Belohnung vergeben wurde (z.B. weil die Frage bereits beantwortet wurde),
      // setzen wir trotzdem den Status basierend auf der Korrektheit
      setLastAnswerCorrect(isC);
    }
    setShowExplanation(true);
  }, [currentQ, awardNormal, globalUserStats, setRoundXp, setRoundCoins, setRewardXp, setRewardCoins, setShowRewardAnimation, setLastAnswerCorrect, updateUserStats, setShowExplanation, isAnimationPlaying, user]);

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
      const rewardXp = isCorrect ? 10 : 0;
      const rewardCoins = isCorrect ? 10 : -5; // 10 Münzen für richtig, -5 für falsch
      setRoundXp((prev) => prev + rewardXp);
      setRoundCoins((prev) => Math.max(0, prev + rewardCoins));
      
      // Animation-Flag setzen, um mehrfache Auslösung zu verhindern
      setIsAnimationPlaying(true);
      
      // Belohnungsanimation auslösen
      setRewardXp(rewardXp);
      setRewardCoins(rewardCoins);
      setShowRewardAnimation(true);
      setLastAnswerCorrect(isCorrect);
      
      // Animation nach 2 Sekunden ausblenden und Flag zurücksetzen
      setTimeout(() => {
        setShowRewardAnimation(false);
        setIsAnimationPlaying(false);
      }, 2000);
      
      // Statistiken aktualisieren
      if (user) {
        const { data: existingStats } = await supabase
          .from('user_stats')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (existingStats) {
          const { error: updateError } = await supabase
            .from('user_stats')
            .update({
              total_xp: (existingStats.total_xp || 0) + rewardXp,
              total_coins: Math.max(0, (existingStats.total_coins || 0) + rewardCoins), // Verhindert negative Münzen
              questions_answered: (existingStats.questions_answered || 0) + 1,
              correct_answers: existingStats.correct_answers + (isCorrect ? 1 : 0),
              last_played: new Date().toISOString()
            })
            .eq('user_id', user.id);

          if (updateError) {
            console.error('Fehler beim Aktualisieren der Statistiken:', updateError);
          }
        }
      }
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

  const handleAnswer = async (isCorrect: boolean) => {
    if (isAnimationPlaying) return;
    
    console.log("QuizContainer - Von DragDropQuestion erhaltener isCorrect-Wert:", isCorrect);
    
    setLastAnswerCorrect(isCorrect);
    setShowExplanation(true);
    
    // Sound abspielen
    if (isCorrect) {
      await playSound(correctSound);
    } else {
      await playSound(wrongSound);
    }
    
    if (!currentQ) return;
    
    const didAward = await awardNormal(currentQ.id, isCorrect);
    if (didAward && globalUserStats) {
      // Belohnungen berechnen
      const rewardXp = isCorrect ? 10 : 0;
      const rewardCoins = isCorrect ? 10 : -5; // 10 Münzen für richtig, -5 für falsch
      setRoundXp(prev => prev + rewardXp);
      setRoundCoins(prev => prev + rewardCoins);
      
      // Animation-Flag setzen, um mehrfache Auslösung zu verhindern
      setIsAnimationPlaying(true);
      
      // Belohnungsanimation auslösen
      setRewardXp(rewardXp);
      setRewardCoins(rewardCoins);
      setShowRewardAnimation(true);
      
      // Animation nach 2 Sekunden ausblenden und Flag zurücksetzen
      setTimeout(() => {
        setShowRewardAnimation(false);
        setIsAnimationPlaying(false);
      }, 2000);
      
      // Statistiken aktualisieren
      if (user) {
        const { data: existingStats } = await supabase
          .from('user_stats')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (existingStats) {
          const { error: updateError } = await supabase
            .from('user_stats')
            .update({
              total_xp: (existingStats.total_xp || 0) + rewardXp,
              total_coins: Math.max(0, (existingStats.total_coins || 0) + rewardCoins), // Verhindert negative Münzen
              questions_answered: (existingStats.questions_answered || 0) + 1,
              correct_answers: existingStats.correct_answers + (isCorrect ? 1 : 0),
              last_played: new Date().toISOString()
            })
            .eq('user_id', user.id);

          if (updateError) {
            console.error('Fehler beim Aktualisieren der Statistiken:', updateError);
          }
        }
      }
    }
  };

  const handleFinalAnswer = async (answer: string) => {
    if (!currentQ || !questions) return;
    const isCorrect = answer.toLowerCase() === currentQ.correct_answer.toLowerCase();
    setSelectedAnswer(answer);
    setShowExplanation(true);
    setIsAnswerSubmitted(true);

    // Sound abspielen
    if (isCorrect) {
      await playSound(correctSound);
    } else {
      await playSound(wrongSound);
    }

    // Belohnungen vergeben
    const didAward = await awardNormal(currentQ.id, isCorrect);
    if (didAward && globalUserStats) {
      const rewardXp = isCorrect ? 10 : 0;
      const rewardCoins = isCorrect ? 10 : -5; // 10 Münzen für richtig, -5 für falsch
      setRoundXp((prev) => prev + rewardXp);
      setRoundCoins((prev) => Math.max(0, prev + rewardCoins));
      
      // Animation-Flag setzen, um mehrfache Auslösung zu verhindern
      setIsAnimationPlaying(true);
      
      // Belohnungsanimation auslösen
      setRewardXp(rewardXp);
      setRewardCoins(rewardCoins);
      setShowRewardAnimation(true);
      
      // Animation nach 2 Sekunden ausblenden und Flag zurücksetzen
      setTimeout(() => {
        setShowRewardAnimation(false);
        setIsAnimationPlaying(false);
      }, 2000);
      
      // Statistiken aktualisieren
      if (user) {
        const { data: existingStats } = await supabase
          .from('user_stats')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (existingStats) {
          const { error: updateError } = await supabase
            .from('user_stats')
            .update({
              total_xp: (existingStats.total_xp || 0) + rewardXp,
              total_coins: Math.max(0, (existingStats.total_coins || 0) + rewardCoins), // Verhindert negative Münzen
              questions_answered: (existingStats.questions_answered || 0) + 1,
              correct_answers: existingStats.correct_answers + (isCorrect ? 1 : 0),
              last_played: new Date().toISOString()
            })
            .eq('user_id', user.id);

          if (updateError) {
            console.error('Fehler beim Aktualisieren der Statistiken:', updateError);
          }
        }
      }
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
              if (isAnimationPlaying) return;
              
              console.log("QuizContainer - Von QuestionComponent erhaltener isCorrect-Wert:", isCorrect);
              
              setLastAnswerCorrect(isCorrect);
              setShowExplanation(true);

              // Sound abspielen
              if (isCorrect) {
                await playSound(correctSound);
              } else {
                await playSound(wrongSound);
              }
              
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
            onComplete={handleAnswer}
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
              if (isAnimationPlaying) return;
              
              // Sound abspielen
              if (isCorrect) {
                await playSound(correctSound);
              } else {
                await playSound(wrongSound);
              }

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
                if (isAnimationPlaying) return;
                
                console.log("LueckentextQuestion onComplete mit isCorrect:", isCorrect);
                
                // Sound abspielen
                if (isCorrect) {
                  await playSound(correctSound);
                } else {
                  await playSound(wrongSound);
                }

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
          <div className="flex flex-col md:flex-row">
            {/* Linke Spalte - Schwarzer Bereich mit Frage */}
            <div className="w-full md:w-[60%] bg-black text-white p-4 md:p-8 relative min-h-[300px] md:min-h-[600px] md:border-r-2 border-gray-400">
              <div className="mb-6 md:mb-12">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-4 mb-4 md:mb-6">
                  <div className="text-lg md:text-xl font-bold whitespace-nowrap">
                    Frage {currentIndex + 1} von {questions?.length || 8}
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
                  {currentQ?.Frage}
                </div>
                
                {/* Erklärungscontainer für reguläre Fragen */}
                {showExplanation && currentQ && currentQ.type !== "open_question" && (
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
                        <span className="font-semibold">Richtige Antwort:</span> {currentQ["Richtige Antwort"]}
                      </p>
                      {currentQ.Begründung && (
                        <div>
                          <span className="font-semibold">Begründung:</span>
                          <p className="mt-1 md:mt-2">{currentQ.Begründung}</p>
                        </div>
                      )}
                    </div>
                    
                    {/* Weiter-Button */}
                    <div className="mt-4 md:mt-6 flex justify-end">
                      <button 
                        onClick={handleNext}
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
                {showExplanation && currentQ && currentQ.type === "open_question" && (
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
                        {currentQ["Richtige Antwort"] || <em className="text-gray-400">Keine Musterlösung verfügbar</em>}
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
                                setLastAnswerCorrect(true);
                                const didAward = await awardNormal(currentQ.id, true);
                                if (didAward && globalUserStats) {
                                  const xpDelta = 10;
                                  const coinDelta = 1;
                                  setRoundXp((prev) => prev + xpDelta);
                                  setRoundCoins((prev) => Math.max(0, prev + coinDelta));
                                  setRewardXp(xpDelta);
                                  setRewardCoins(coinDelta);
                                  setShowRewardAnimation(true);
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
                                setLastAnswerCorrect(false);
                                const didAward = await awardNormal(currentQ.id, false);
                                if (didAward && globalUserStats) {
                                  const xpDelta = 0;
                                  const coinDelta = -1;
                                  setRoundXp((prev) => prev + xpDelta);
                                  setRoundCoins((prev) => Math.max(0, prev + coinDelta));
                                  setRewardXp(xpDelta);
                                  setRewardCoins(coinDelta);
                                  setShowRewardAnimation(true);
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
                            onClick={handleNext}
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
                {currentQ?.type === "open_question" ? (
                  <div className="w-full">{content}</div>
                ) : currentQ?.type === "true_false" ? (
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
      </div>
    </div>
  );
}

export default QuizContainer;