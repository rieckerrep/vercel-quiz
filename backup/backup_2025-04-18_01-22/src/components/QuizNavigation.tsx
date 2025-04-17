import { useQuizStore } from '../store/useQuizStore';
import { useEffect, useState } from 'react';

export function QuizNavigation() {
  const { 
    questions, 
    currentQuestionIndex, 
    setCurrentQuestionIndex,
    answeredQuestions
  } = useQuizStore();

  // Lokaler Zustand für die beantworteten Fragen
  const [localAnsweredQuestions, setLocalAnsweredQuestions] = useState<number[]>([]);

  // Aktualisiere den lokalen Zustand, wenn sich answeredQuestions im Store ändert
  useEffect(() => {
    setLocalAnsweredQuestions(answeredQuestions);
  }, [answeredQuestions]);

  return (
    <div className="grid grid-cols-5 gap-2 p-4">
      {questions.map((question, index) => {
        const isAnswered = localAnsweredQuestions.includes(question.id);
        
        return (
          <button
            key={question.id}
            onClick={() => setCurrentQuestionIndex(index)}
            className={`
              p-2 rounded-lg text-sm font-medium transition-colors
              ${currentQuestionIndex === index 
                ? 'bg-blue-500 text-white' 
                : isAnswered
                  ? 'bg-gray-300 text-gray-700'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }
            `}
          >
            {index + 1}
          </button>
        );
      })}
    </div>
  );
} 