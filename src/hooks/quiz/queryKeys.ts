import { QueryKey } from '@tanstack/react-query';

export const queryKeys = {
  profile: (userId: string): QueryKey => ['profile', userId],
  stats: (userId: string): QueryKey => ['stats', userId],
  userStatsByUser: (userId: string): QueryKey => ['userStatsByUser', userId],
  questions: (chapterId: number): QueryKey => ['questions', chapterId],
  answeredQuestions: (userId: string): QueryKey => ['answeredQuestions', userId],
  answeredQuestionsByUser: (userId: string): QueryKey => ['answeredQuestionsByUser', userId],
  answeredSubQuestionsByUser: (userId: string): QueryKey => ['answeredSubQuestionsByUser', userId],
  quizAnswersByUser: (userId: string): QueryKey => ['quizAnswersByUser', userId],
  quizProgress: (userId: string): QueryKey => ['quizProgress', userId],
  subQuestions: (questionId: number): QueryKey => ['subQuestions', questionId],
  progress: (userId: string, chapterId: number): QueryKey => ['progress', userId, chapterId]
}; 