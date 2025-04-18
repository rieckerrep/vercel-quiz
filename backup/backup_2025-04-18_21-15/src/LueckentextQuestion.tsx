import { useState } from "react";
import { motion } from "framer-motion";

interface LueckentextQuestionProps {
  questionText: string;
  correctAnswer: string;
  onComplete: (isCorrect: boolean) => void;
  hint: string | null;
}

export default function LueckentextQuestion({
  questionText,
  correctAnswer,
  onComplete,
  hint
}: LueckentextQuestionProps) {
  const [userAnswer, setUserAnswer] = useState<string>("");
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState<boolean>(false);
  const [isButtonDisabled, setIsButtonDisabled] = useState<boolean>(false);

  // Prüfe, ob die Antwort exakt übereinstimmt (unter Berücksichtigung von Leerzeichen und Groß-/Kleinschreibung)
  const checkAnswer = () => {
    // Deaktiviere Button, um weitere Versuche zu verhindern
    setIsButtonDisabled(true);
    setIsAnswerSubmitted(true);

    // Normalisiere beide Antworten (entferne alle Whitespace-Zeichen am Anfang und Ende)
    // und für den verbesserten Vergleich auch mehrfache Leerzeichen innerhalb des Texts
    const normalizedUserAnswer = userAnswer.trim();
    const normalizedCorrectAnswer = correctAnswer.trim();
    
    // Für den erweiterten Vergleich
    const cleanedUserAnswer = normalizedUserAnswer
      .replace(/\s+/g, ' ')  // Mehrere Leerzeichen zu einem reduzieren
      .toLowerCase();         // Groß-/Kleinschreibung ignorieren
    
    const cleanedCorrectAnswer = normalizedCorrectAnswer
      .replace(/\s+/g, ' ')  // Mehrere Leerzeichen zu einem reduzieren
      .toLowerCase();         // Groß-/Kleinschreibung ignorieren
    
    // Debug-Ausgabe in der Konsole
    console.log("Benutzerantwort (original):", normalizedUserAnswer);
    console.log("Korrekte Antwort (original):", normalizedCorrectAnswer);
    console.log("Benutzerantwort (bereinigt):", cleanedUserAnswer);
    console.log("Korrekte Antwort (bereinigt):", cleanedCorrectAnswer);
    console.log("Länge Benutzerantwort:", normalizedUserAnswer.length);
    console.log("Länge korrekte Antwort:", normalizedCorrectAnswer.length);
    
    // Prüfe auf exakte Übereinstimmung (case-sensitive)
    const isExactMatch = normalizedUserAnswer === normalizedCorrectAnswer;
    
    // Prüfe auf bereinigte Übereinstimmung (case-insensitive, Leerzeichen normalisiert)
    const isCleanMatch = cleanedUserAnswer === cleanedCorrectAnswer;
    
    // Alternative Prüfung für Debugging
    let charactersMatch = true;
    for (let i = 0; i < Math.max(normalizedUserAnswer.length, normalizedCorrectAnswer.length); i++) {
      if (normalizedUserAnswer[i] !== normalizedCorrectAnswer[i]) {
        charactersMatch = false;
        console.log(`Nicht übereinstimmend an Position ${i}: '${normalizedUserAnswer[i]}' vs '${normalizedCorrectAnswer[i]}'`);
        console.log(`ASCII-Code: ${normalizedUserAnswer.charCodeAt(i)} vs ${normalizedCorrectAnswer.charCodeAt(i)}`);
      }
    }
    
    console.log("Exakte Übereinstimmung:", isExactMatch);
    console.log("Bereinigte Übereinstimmung:", isCleanMatch);
    console.log("Zeichen für Zeichen:", charactersMatch);
    
    // Wir akzeptieren entweder exakte Übereinstimmung oder bereinigte Übereinstimmung
    const isAnswerCorrect = (isExactMatch || isCleanMatch);
    
    // Benachrichtige den Container direkt, ob richtig oder falsch
    if (isAnswerCorrect) {
      // Richtige Antwort
      console.log("Als richtig gewertet!");
      console.log("An onComplete übergebener Wert:", true);
      onComplete(true);
    } else {
      // Falsche Antwort - hier erfolgt jetzt direkt der Punktabzug
      console.log("Als falsch gewertet");
      console.log("An onComplete übergebener Wert:", false);
      onComplete(false);
    }
  };

  return (
    <div className="w-full">
      <motion.div
        className="flex flex-col gap-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {questionText && (
          <div className="text-lg font-medium mb-2">{questionText}</div>
        )}
        
        <div className="relative">
          <input 
            type="text"
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            placeholder="Gib die exakte Antwort ein..."
            className={`w-full p-3 border-2 border-gray-300 rounded-md focus:outline-none focus:border-black transition-colors`}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isButtonDisabled) {
                checkAnswer();
              }
            }}
            disabled={isAnswerSubmitted}
          />
        </div>

        {hint && (
          <div className="text-sm text-gray-600 mt-2">
            <span className="font-medium">Tipp:</span> {hint}
          </div>
        )}
        
        <div className="flex justify-end mt-2">
          <button
            onClick={checkAnswer}
            disabled={isButtonDisabled || userAnswer.trim() === ''}
            className={`px-6 py-2 text-white rounded font-medium transition-colors ${
              isButtonDisabled || userAnswer.trim() === ''
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-black hover:bg-gray-800'
            }`}
          >
            Prüfen
          </button>
        </div>
      </motion.div>
    </div>
  );
} 