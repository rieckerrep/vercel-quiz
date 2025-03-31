import { motion } from "framer-motion";
import { useState } from "react";

interface Question {
  id: number;
  Frage: string;
  type: string;
  "Richtige Antwort"?: string;
  Begründung: string | null;
  "Antwort A"?: string;
  "Antwort B"?: string;
  "Antwort C"?: string;
  "Antwort D"?: string;
  chapter_id: number;
}

interface QuestionComponentProps {
  question: Question;
  onAnswer: (selected: string, isCorrect: boolean) => void;
}

export default function QuestionComponent({
  question,
  onAnswer,
}: QuestionComponentProps) {
  // Sammle alle Antwortoptionen mit richtiger Typisierung
  const options: string[] = [];
  if (question["Antwort A"]) options.push(question["Antwort A"]);
  if (question["Antwort B"]) options.push(question["Antwort B"]);
  if (question["Antwort C"]) options.push(question["Antwort C"]);
  if (question["Antwort D"]) options.push(question["Antwort D"]);

  // Buchstaben für die Optionen
  const letters = ["A", "B", "C", "D"];

  return (
    <div className="w-full">
      <motion.div 
        className="flex flex-col gap-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="space-y-4 mb-6">
          {options.map((option, index) => (
            <motion.div 
              key={index}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="relative"
            >
              <button
                className="w-full text-left p-4 border-2 border-gray-300 rounded-md 
                  hover:border-black hover:bg-gray-50 transition-all duration-200
                  flex items-center"
                onClick={() => {
                  const isCorrect =
                    option.trim().toLowerCase() ===
                    (question["Richtige Antwort"] || "").trim().toLowerCase();
                  onAnswer(option, isCorrect);
                }}
              >
                <div className="flex-shrink-0 w-8 h-8 bg-black text-white rounded-full flex items-center justify-center font-bold mr-3">
                  {letters[index]}
                </div>
                <div className="flex-grow whitespace-normal break-words text-gray-800">
                  {option}
                </div>
              </button>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
