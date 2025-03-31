import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import { motion } from "framer-motion";

// Hauptfrage-Interface
interface Question {
  id: number;
  Frage: string;
  type: string;
  "Richtige Antwort": string;
  Begründung?: string;
  chapter_id: number;
}

// Subquestion-Interface
interface Subquestion {
  id: number;
  statement_text: string;
  correct_answer: string;
  explanation?: string;
}

// Das Objekt, das wir an onComplete schicken
export interface CasesQuestionResult {
  overallCorrect: boolean;
  subAnswers: Array<{ id: number; isCorrect: boolean }>;
}

interface CasesQuestionProps {
  question: Question;
  user: any; // falls du user-Daten brauchst
  // Ruft der Parent (QuizContainer) auf, wenn alle Subfragen fertig sind
  onComplete: (result: CasesQuestionResult) => void;
  // Ruft der Parent bei jeder Subfrage an, um XP zu vergeben
  onSubquestionAnswered: (subId: number, isCorrect: boolean) => void;
}

export default function CasesQuestion({
  question,
  user,
  onComplete,
  onSubquestionAnswered,
}: CasesQuestionProps) {
  const [subquestions, setSubquestions] = useState<Subquestion[]>([]);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [currentSubIndex, setCurrentSubIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  // Gesteuert, ob wir nach der letzten Subfrage die finale Erklärung (Begründung) zeigen
  const [showFinalExplanation, setShowFinalExplanation] = useState(false);
  const [finalAnswered, setFinalAnswered] = useState(false);

  // 1) Lade die Subfragen
  useEffect(() => {
    async function loadSubs() {
      const { data, error } = await supabase
        .from("cases_subquestions")
        .select("*")
        .eq("question_id", question.id)
        .order("id", { ascending: true });
      if (error) {
        console.error("Fehler beim Laden der Subfragen:", error);
      } else if (data) {
        setSubquestions(data);
        setAnswers(new Array(data.length).fill(undefined));
      }
      setLoading(false);
    }
    loadSubs();
  }, [question.id]);

  if (loading) {
    return (
      <div className="min-h-[200px] flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 border-4 border-gray-800 border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-gray-800 font-medium">Subfragen werden geladen...</p>
        </div>
      </div>
    );
  }

  // Falls keinerlei Subfragen existieren
  if (subquestions.length === 0) {
    return (
      <div className="flex justify-center mt-6">
        <button
          className="px-6 py-2 bg-black text-white rounded font-medium hover:bg-gray-800 transition-colors flex items-center"
          onClick={() => onComplete({ overallCorrect: true, subAnswers: [] })}
        >
          Weiter
          <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </button>
      </div>
    );
  }

  // 2) Klick auf "Richtig/Falsch"
  const handleSubAnswer = (answer: "Richtig" | "Falsch", index: number) => {
    if (!subquestions[index]) return;
    const sub = subquestions[index];
    // Check correctness
    const isCorrect =
      (sub.correct_answer || "").toLowerCase() === answer.toLowerCase();

    // Speichere lokal
    setAnswers((prev) => {
      const copy = [...prev];
      copy[index] = isCorrect;
      return copy;
    });

    // XP‑Vergabe macht der QuizContainer => wir rufen onSubquestionAnswered
    onSubquestionAnswered(sub.id, isCorrect);

    // Nächste Subfrage
    if (index < subquestions.length - 1) {
      setCurrentSubIndex(index + 1);
    } else {
      // Letzte Subfrage => wir zeigen später den "Weiter →"
      setCurrentSubIndex(subquestions.length);
    }
  };

  // 3) Klick auf "Weiter →" => finale Erklärung zeigen
  const handleShowFinalExplanation = () => {
    setShowFinalExplanation(true);
  };

  // 4) "Fertig" => Parent bekommt das Objekt
  const handleFinalDone = () => {
    setFinalAnswered(true);
    const overallCorrect = answers.every((ans) => ans === true);
    // Liste aller Subfragen und ob sie korrekt waren
    const subAnswers = subquestions.map((sub, idx) => ({
      id: sub.id,
      isCorrect: answers[idx] === true,
    }));
    onComplete({ overallCorrect, subAnswers });
  };

  // Fortschrittsanzeige berechnen
  const progress = Math.round((currentSubIndex / subquestions.length) * 100);

  return (
    <div className="w-full overflow-hidden">
      {/* Fortschrittsanzeige */}
      {!showFinalExplanation && !finalAnswered && (
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Fortschritt</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-black"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      )}

      {/* Scrollbarer Bereich für den Inhalt - max-height mit fester Größe */}
      <div className="max-h-[400px] overflow-y-auto pr-2">
        {/* Finale Erklärung anzeigen, falls showFinalExplanation=true */}
        {showFinalExplanation && !finalAnswered && (
          <motion.div 
            className="p-5 bg-gray-800 rounded-md border border-gray-700 text-white"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <h3 className="text-lg font-bold mb-3 text-white flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Zusammenfassung
            </h3>
            <div className="mb-4 text-gray-200">
              {question.Begründung ?? "Keine zusätzliche Gesamt-Begründung."}
            </div>
            
            <div className="mt-6 flex flex-col items-center">
              <motion.div 
                className="flex items-center justify-center mb-4"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.2 }}
              >
                {answers.every(a => a === true) ? (
                  <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
                    <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                ) : (
                  <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center">
                    <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                )}
              </motion.div>
              
              <p className="text-lg font-medium mb-4">
                {answers.every(a => a === true) 
                  ? "Super! Alle Antworten sind korrekt." 
                  : "Einige Antworten waren nicht korrekt."}
              </p>
              
              <button 
                className="px-6 py-2 bg-yellow-400 text-black rounded font-medium hover:bg-yellow-500 transition-colors flex items-center"
                onClick={handleFinalDone}
              >
                Zur nächsten Frage
                <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </div>
          </motion.div>
        )}

        {/* Falls alles abgeschlossen => gar nichts mehr anzeigen */}
        {finalAnswered && null}

        {/* Ansonsten Subfragen abfragen */}
        {!showFinalExplanation && !finalAnswered && (
          <div className="space-y-4">
            {subquestions.map((sub, i) => {
              const userHasAnswered = answers[i] !== undefined;
              // Noch nicht freigeschaltet => i > currentSubIndex => nicht rendern
              if (i > currentSubIndex) return null;

              const isCorrect = answers[i];
              return (
                <motion.div 
                  key={sub.id} 
                  className="p-4 bg-white border border-gray-300 rounded-md shadow-sm overflow-hidden"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.1 }}
                >
                  <div className="flex items-start">
                    <div className="flex-shrink-0 w-8 h-8 bg-black text-white rounded-full flex items-center justify-center font-bold mr-3">
                      {i + 1}
                    </div>
                    <div className="flex-grow">
                      <p className="text-gray-800 font-medium mb-4">{sub.statement_text}</p>

                      {/* Buttons nur solange i === currentSubIndex und noch nicht beantwortet */}
                      {!userHasAnswered && i === currentSubIndex && (
                        <div className="flex gap-3 mt-4">
                          <button
                            className="flex-1 py-2 px-4 bg-green-100 border-2 border-green-500 text-green-700 rounded-md font-medium hover:bg-green-200 transition-colors flex items-center justify-center"
                            onClick={() => handleSubAnswer("Richtig", i)}
                          >
                            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Richtig
                          </button>
                          <button
                            className="flex-1 py-2 px-4 bg-red-100 border-2 border-red-500 text-red-700 rounded-md font-medium hover:bg-red-200 transition-colors flex items-center justify-center"
                            onClick={() => handleSubAnswer("Falsch", i)}
                          >
                            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Falsch
                          </button>
                        </div>
                      )}

                      {/* Feedback, sobald beantwortet */}
                      {userHasAnswered && (
                        <motion.div 
                          className={`mt-4 p-4 rounded-md ${isCorrect ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          transition={{ duration: 0.3 }}
                        >
                          <div className="flex items-center">
                            {isCorrect ? (
                              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mr-3">
                                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                            ) : (
                              <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center mr-3">
                                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </div>
                            )}
                            <h4 className={`font-medium ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                              {isCorrect ? "Richtige Antwort!" : "Falsche Antwort"}
                            </h4>
                          </div>
                          
                          {sub.explanation && sub.explanation.trim() !== "" && (
                            <div className="mt-2 ml-9 text-gray-700">
                              {sub.explanation}
                            </div>
                          )}
                        </motion.div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Button am unteren Rand, außerhalb des scrollbaren Bereichs */}
      {!showFinalExplanation && !finalAnswered && currentSubIndex >= subquestions.length && (
        <div className="flex justify-center mt-4">
          <motion.button
            className="px-6 py-2 bg-black text-white rounded font-medium hover:bg-gray-800 transition-colors flex items-center"
            onClick={handleShowFinalExplanation}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            Zusammenfassung anzeigen
            <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </motion.button>
        </div>
      )}
    </div>
  );
}
