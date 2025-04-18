import { useState, useEffect } from "react";
import { supabase } from "./lib/supabaseClient";
import { Database } from "./lib/supabase";

type Question = Database['public']['Tables']['questions']['Row'];

interface TrueFalseQuestionProps {
  questionId: number;
  onComplete: (isCorrect: boolean) => void;
}

const TrueFalseQuestion: React.FC<TrueFalseQuestionProps> = ({
  questionId,
  onComplete,
}) => {
  const [userAnswer, setUserAnswer] = useState<string | null>(null);
  const [questionData, setQuestionData] = useState<{
    Frage: string;
    "Richtige Antwort": string;
  } | null>(null);

  useEffect(() => {
    async function loadQuestion() {
      const { data, error } = await supabase
        .from("questions")
        .select("Frage, Richtige Antwort")
        .eq("id", questionId)
        .single<Pick<Question, 'Frage' | 'Richtige Antwort'>>();

      if (error) {
        console.error("Fehler beim Laden der Frage:", error);
        return;
      }

      if (data && data.Frage && data["Richtige Antwort"]) {
        setQuestionData({
          Frage: data.Frage,
          "Richtige Antwort": data["Richtige Antwort"]
        });
      } else {
        console.error("Frage oder Antwort fehlen in den Daten");
      }
    }

    loadQuestion();
  }, [questionId]);

  const handleAnswer = (answer: string) => {
    setUserAnswer(answer);
    
    // Normalisiere die Datenbankantwort
    const dbAnswer = questionData?.["Richtige Antwort"].toLowerCase().trim() || "";
    const isDbAnswerTrue = ["true", "wahr", "1", "ja", "richtig"].includes(dbAnswer);
    
    // Bestimme, ob die Antwort korrekt ist
    // Wenn der Benutzer "Richtig" wählt und die Datenbankantwort "true" ist, ist es richtig
    // Wenn der Benutzer "Falsch" wählt und die Datenbankantwort "false" ist, ist es auch richtig
    const isCorrect = (answer === "Richtig" && isDbAnswerTrue) || (answer === "Falsch" && !isDbAnswerTrue);
    
    console.log("TrueFalseQuestion - Antwortüberprüfung:", {
      dbAnswer,
      isDbAnswerTrue,
      userAnswer: answer,
      isCorrect
    });
    
    onComplete(isCorrect);
  };

  if (!questionData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 border-4 border-gray-800 border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-gray-800 font-medium">Frage wird geladen...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      <div className="text-xl font-medium text-gray-800">
        {questionData.Frage}
      </div>
      <div className="flex justify-between w-full gap-4">
        {["Richtig", "Falsch"].map((option) => (
          <button
            key={option}
            onClick={() => handleAnswer(option)}
            disabled={userAnswer !== null}
            className="w-full py-3 border border-black text-black bg-white font-medium text-center text-lg"
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
};

export default TrueFalseQuestion;
