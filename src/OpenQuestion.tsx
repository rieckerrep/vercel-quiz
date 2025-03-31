// OpenQuestion.tsx
import { useState } from 'react';

interface OpenQuestionProps {
  questionText: string; // z.B. "Was bedeutet Rechtfertigung?"
  correctAnswer: string; // z.B. "Sich im Einklang mit einer Norm zu verhalten."
  onCompareAnswer: (userAnswer: string) => void;
  onSelfEvaluation?: (isCorrect: boolean) => void;
  disabled?: boolean;
  displayInBlackArea?: boolean; // Gibt an, ob der Vergleichscontainer in dieser Komponente angezeigt werden soll
}

/**
 * OpenQuestion – Der User gibt seine Antwort im Textarea ein.
 * Beim Klick auf "Antwort überprüfen" wird der Text ausgelesen.
 */
export default function OpenQuestion({
  questionText,
  correctAnswer,
  onCompareAnswer,
  onSelfEvaluation,
  disabled = false,
  displayInBlackArea = true, // Standardmäßig wird der Vergleichscontainer hier angezeigt
}: OpenQuestionProps) {
  const [userAnswer, setUserAnswer] = useState<string>("");
  const [isComparing, setIsComparing] = useState<boolean>(false);
  const [selfEvaluation, setSelfEvaluation] = useState<"correct" | "incorrect" | null>(null);

  const handleCompare = () => {
    setIsComparing(true);
    onCompareAnswer(userAnswer.trim());
  };

  const handleSelfEvaluation = (isCorrect: boolean) => {
    setSelfEvaluation(isCorrect ? "correct" : "incorrect");
    // Benachrichtigung an den QuizContainer über die Selbsteinschätzung
    if (onSelfEvaluation) {
      onSelfEvaluation(isCorrect);
    }
  };

  return (
    <div className="open-question w-full">
      {questionText && <p className="mb-3">{questionText}</p>}
      <textarea
        value={userAnswer}
        onChange={(e) => setUserAnswer(e.target.value)}
        disabled={disabled || isComparing}
        placeholder="Gib hier deine Antwort ein..."
        className="w-full p-3 border border-gray-300 rounded min-h-[150px] bg-white text-black"
      />
      
      {!isComparing && userAnswer.trim() && (
        <button
          className="mt-4 bg-yellow-400 text-black py-2 px-6 rounded hover:bg-yellow-500 transition-colors"
          onClick={handleCompare}
          disabled={disabled}
        >
          Antwort überprüfen
        </button>
      )}

      {/* Vergleichscontainer wird nur angezeigt, wenn displayInBlackArea true ist */}
      {isComparing && displayInBlackArea && (
        <div className="mt-8 p-5 bg-gray-800 rounded-md border border-yellow-400 overflow-y-auto max-h-[350px]">
          <h3 className="text-lg font-bold mb-3 text-white">Vergleiche deine Antwort:</h3>
          
          <div className="mb-4">
            <h4 className="font-semibold text-white">Deine Antwort:</h4>
            <div className="p-3 bg-gray-700 border border-gray-600 rounded mt-1 text-white">
              {userAnswer.trim() || <em className="text-gray-400">Keine Antwort</em>}
            </div>
          </div>
          
          <div className="mb-4">
            <h4 className="font-semibold text-white">Musterlösung:</h4>
            <div className="p-3 bg-gray-700 border border-gray-600 rounded mt-1 text-white">
              {correctAnswer || <em className="text-gray-400">Keine Musterlösung verfügbar</em>}
            </div>
          </div>
          
          <div className="mt-5">
            <p className="mb-2 font-medium text-white">Wie bewertest du deine Antwort?</p>
            <div className="flex justify-between">
              <div className="flex gap-3">
                <button
                  className={`py-2 px-6 rounded font-medium transition-colors flex items-center gap-2 ${
                    selfEvaluation === "correct"
                      ? "bg-green-500 text-white"
                      : "bg-gray-700 hover:bg-green-500 text-white"
                  }`}
                  onClick={() => handleSelfEvaluation(true)}
                  disabled={selfEvaluation !== null}
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
                    selfEvaluation === "incorrect"
                      ? "bg-red-500 text-white"
                      : "bg-gray-700 hover:bg-red-500 text-white"
                  }`}
                  onClick={() => handleSelfEvaluation(false)}
                  disabled={selfEvaluation !== null}
                >
                  <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <span>Falsch</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
