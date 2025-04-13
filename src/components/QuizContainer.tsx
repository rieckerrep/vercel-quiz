import React from 'react';
import { Question } from '../types/question';
import { useQuizData } from '../hooks/useQuizData';
import LoadingSpinner from './LoadingSpinner';

interface QuizContainerProps {
  chapterId: number;
}

const QuizContainer: React.FC<QuizContainerProps> = ({ chapterId }) => {
  const { questions, isLoading, error, handleAnswer } = useQuizData(chapterId);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <div className="error-message">Fehler beim Laden der Fragen: {error}</div>;
  }

  if (!questions || questions.length === 0) {
    return <div className="no-questions">Keine Fragen für dieses Kapitel verfügbar.</div>;
  }

  return (
    <div className="quiz-container">
      {questions.map((question: Question) => (
        <div key={question.id} className="bg-white rounded-lg shadow-md p-6 mb-4">
          <h3 className="text-lg font-semibold mb-4">{question.question_text}</h3>
          <div className="space-y-2">
            {[
              { id: 'A', text: question.answers.A },
              { id: 'B', text: question.answers.B },
              { id: 'C', text: question.answers.C },
              { id: 'D', text: question.answers.D }
            ].filter(answer => answer.text !== null).map((answer) => (
              <button
                key={answer.id}
                onClick={() => handleAnswer(question.id, answer.id)}
                className="w-full text-left p-3 border rounded-md hover:bg-gray-50 transition-colors"
              >
                {answer.text}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default QuizContainer; 