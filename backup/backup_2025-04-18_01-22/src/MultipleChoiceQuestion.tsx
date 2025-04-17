import { useState, useEffect } from "react";
import { supabase } from "./lib/supabaseClient";
import { motion } from "framer-motion";
import { useQuizStore } from "./store/useQuizStore";

// Datentyp für Eintrag in der Tabelle multiple_choice_options
interface MCOption {
  id: number;
  question_id: number;
  option_text: string;
  is_correct: boolean;
}

interface MultipleChoiceQuestionProps {
  questionId: number; // ID der Frage in "questions"
  onComplete: (overallCorrect: boolean) => void; // Callback, um dem QuizContainer das Ergebnis mitzuteilen
}

export default function MultipleChoiceQuestion({
  questionId,
  onComplete,
}: MultipleChoiceQuestionProps) {
  const [options, setOptions] = useState<MCOption[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);

  // Lade die Antwortoptionen aus der Tabelle multiple_choice_options
  useEffect(() => {
    async function loadOptions() {
      const { data, error } = await supabase
        .from("multiple_choice_options")
        .select("*")
        .eq("question_id", questionId)
        .order("id", { ascending: true });
      if (error) {
        console.error("Fehler beim Laden der Multiple-Choice-Optionen:", error);
      } else if (data) {
        setOptions(data);
      }
      setLoading(false);
    }
    loadOptions();
  }, [questionId]);

  // Checkbox-Handler: User klickt eine Option an oder ab
  function handleCheck(optId: number) {
    const newSelected = new Set(selected);
    if (newSelected.has(optId)) {
      newSelected.delete(optId);
    } else {
      newSelected.add(optId);
    }
    setSelected(newSelected);
  }

  // Button "Antwort prüfen"
  function handleSubmit() {
    // Wir prüfen, ob alle is_correct==true ausgewählt und alle is_correct==false abgewählt sind
    const allCorrectSelected = options.every((opt) => {
      if (opt.is_correct) {
        return selected.has(opt.id);
      } else {
        return !selected.has(opt.id);
      }
    });

    // Formatiere die richtigen Antworten für die Anzeige
    const correctAnswers = options
      .filter(opt => opt.is_correct)
      .map(opt => opt.option_text)
      .join('\n');

    // Speichere die richtigen Antworten im Store
    useQuizStore.setState({ correctMultipleChoiceAnswer: correctAnswers });

    // Callback an den QuizContainer
    onComplete(allCorrectSelected);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 border-4 border-gray-800 border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-gray-800 font-medium">Optionen werden geladen...</p>
        </div>
      </div>
    );
  }
  
  if (options.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <p className="text-gray-700 mb-6">Keine Antwortoptionen vorhanden.</p>
        <button 
          onClick={() => onComplete(false)}
          className="px-6 py-3 bg-yellow-400 text-black font-medium rounded hover:bg-yellow-500 transition-colors flex items-center"
        >
          Weiter
          <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="w-full">
      <motion.div 
        className="flex flex-col gap-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="space-y-4 mb-6">
          {options.map((opt) => (
            <motion.div 
              key={opt.id}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="relative"
            >
              <label 
                className={`
                  flex items-center p-2 cursor-pointer border-2 rounded-md border-gray-300
                  ${selected.has(opt.id) ? 'border-black bg-gray-100' : 'hover:border-gray-400'}
                  transition-all duration-200
                `}
              >
                <div className="mr-3 relative">
                  <input
                    type="checkbox"
                    checked={selected.has(opt.id)}
                    onChange={() => handleCheck(opt.id)}
                    className="sr-only" // versteckt Standard-Checkbox
                  />
                  <div className={`
                    w-5 h-5 border-2 rounded-md flex items-center justify-center
                    ${selected.has(opt.id) ? 'bg-black border-black' : 'border-gray-400'}
                  `}>
                    {selected.has(opt.id) && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
                <span className="text-gray-800 text-base">{opt.option_text}</span>
              </label>
            </motion.div>
          ))}
        </div>
        
        <div className="flex justify-end">
          <button 
            onClick={handleSubmit} 
            className="px-6 py-2 bg-black text-white font-medium rounded hover:bg-gray-800 transition-colors"
          >
            Antwort prüfen
          </button>
        </div>
      </motion.div>
    </div>
  );
}
