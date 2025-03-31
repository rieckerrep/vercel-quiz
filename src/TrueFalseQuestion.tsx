import React, { useState } from "react";

interface TrueFalseQuestionProps {
  questionText: string;
  correctAnswer: string;
  onComplete: (isCorrect: boolean) => void;
}

const TrueFalseQuestion: React.FC<TrueFalseQuestionProps> = ({
  questionText,
  correctAnswer,
  onComplete,
}) => {
  const [userAnswer, setUserAnswer] = useState<string | null>(null);

  const handleAnswer = (answer: string) => {
    setUserAnswer(answer);
    const isCorrect = answer.toLowerCase() === correctAnswer.toLowerCase();
    onComplete(isCorrect);
  };

  return (
    <div className="w-full">
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
