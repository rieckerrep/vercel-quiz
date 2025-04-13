import React from 'react';
import { Question } from '../types/question';
import { useQuizData } from '../hooks/useQuizData';
import QuestionCard from './QuestionCard';
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
        <QuestionCard
          key={question.id}
          question={question}
          onAnswer={handleAnswer}
        />
      ))}
    </div>
  );
};

export default QuizContainer; 