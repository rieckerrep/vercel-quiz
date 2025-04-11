export const queryKeys = {
  questions: (chapterId: number) => ['questions', chapterId] as const,
  questionsByChapter: (chapterId: string) => [...queryKeys.questions(Number(chapterId))] as const,
  quizAnswers: ['quizAnswers'] as const,
  quizAnswersByUser: (userId: string) => [...queryKeys.quizAnswers, userId] as const,
  subQuestions: ['subQuestions'] as const,
  subQuestionsByQuestion: (questionId: string) => [...queryKeys.subQuestions, questionId] as const,
  subQuestionAnswers: ['subQuestionAnswers'] as const,
  subQuestionAnswersByUser: (userId: string) => [...queryKeys.subQuestionAnswers, userId] as const,
  userStats: ['userStats'] as const,
  userStatsByUser: (userId: string) => [...queryKeys.userStats, userId] as const,
  answeredQuestions: (userId: string) => ['answeredQuestions', userId] as const,
  answeredQuestionsByUser: (userId: string, chapterId: number) => ['answeredQuestions', userId, chapterId] as const,

  // Queries
  answeredSubQuestions: (userId: string) => ['answeredSubQuestions', userId] as const,

  // Mutations
  answerQuestion: (questionId: string) => ['answerQuestion', questionId] as const,
  answerSubQuestion: (subQuestionId: string) => ['answerSubQuestion', subQuestionId] as const,
  updateUserStats: (userId: string) => ['updateUserStats', userId] as const,

  // Cache Invalidation
  invalidateAnsweredQuestions: (userId: string) => ['answeredQuestions', userId] as const,
  invalidateUserStats: (userId: string) => ['userStats', userId] as const,
  invalidateSubQuestions: (questionId: string) => ['subQuestions', questionId] as const,
  invalidateAnsweredSubQuestions: (userId: string) => ['answeredSubQuestions', userId] as const,
} as const 