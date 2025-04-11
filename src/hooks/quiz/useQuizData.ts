import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { queryKeys } from './queryKeys';
import { Question, QuizAnswer, SubQuestion, UserStats, AnsweredSubQuestion } from '../../types/quiz';
import correctSound from '../../assets/sounds/correct.mp3';
import wrongSound from '../../assets/sounds/wrong.mp3';
import { useQuizEventBus } from './quizEventBus';
import { Answer, SubAnswer } from './types';

export const useQuestions = (chapterId: number) => {
  return useQuery<Question[]>({
    queryKey: queryKeys.questions(chapterId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('chapter_id', chapterId);

      if (error) throw error;
      return data;
    },
  });
};

export const useAnsweredQuestions = (userId: string) => {
  return useQuery<QuizAnswer[]>({
    queryKey: queryKeys.answeredQuestions(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('answered_questions')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;
      return data.map(answer => ({
        ...answer,
        question_id: answer.question_id || 0,
        is_correct: answer.is_correct || false,
        answered_at: answer.answered_at || new Date().toISOString()
      }));
    },
  });
};

export const useSaveAnswer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ questionId, isCorrect, userId }: { questionId: number; isCorrect: boolean; userId: string }) => {
      const { data, error } = await supabase
        .from('answered_questions')
        .insert([
          {
            question_id: questionId,
            is_correct: isCorrect,
            user_id: userId,
            answered_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async ({ questionId, isCorrect, userId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.answeredQuestions(userId) });
      const previousAnswers = queryClient.getQueryData<QuizAnswer[]>(queryKeys.answeredQuestions(userId)) || [];
      
      queryClient.setQueryData<QuizAnswer[]>(queryKeys.answeredQuestions(userId), (old) => [
        ...(old || []),
        {
          id: Date.now(),
          question_id: questionId,
          user_id: userId,
          is_correct: isCorrect,
          answered_at: new Date().toISOString()
        }
      ]);

      return { previousAnswers };
    },
    onError: (_, { userId }, context) => {
      if (context?.previousAnswers) {
        queryClient.setQueryData(queryKeys.answeredQuestions(userId), context.previousAnswers);
      }
    },
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.answeredQuestions(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.userStatsByUser(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.quizAnswersByUser(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.quizProgress(userId) });
    },
  });
};

export const useSaveSubAnswer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ subQuestionId, isCorrect, userId }: { subQuestionId: number; isCorrect: boolean; userId: string }) => {
      const { data, error } = await supabase
        .from('answered_cases_subquestions')
        .insert([
          {
            subquestion_id: subQuestionId,
            is_correct: isCorrect,
            user_id: userId,
            answered_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async ({ subQuestionId, isCorrect, userId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.subQuestionAnswersByUser(userId) });
      const previousSubAnswers = queryClient.getQueryData<AnsweredSubQuestion[]>(queryKeys.subQuestionAnswersByUser(userId)) || [];
      
      const newAnswer: AnsweredSubQuestion = {
        id: Date.now(),
        sub_question_id: subQuestionId,
        user_id: userId,
        is_correct: isCorrect,
        answered_at: new Date().toISOString()
      };

      queryClient.setQueryData<AnsweredSubQuestion[]>(queryKeys.subQuestionAnswersByUser(userId), (old) => [
        ...(old || []),
        newAnswer
      ]);

      return { previousSubAnswers };
    },
    onError: (_, { userId }, context) => {
      if (context?.previousSubAnswers) {
        queryClient.setQueryData(queryKeys.subQuestionAnswersByUser(userId), context.previousSubAnswers);
      }
    },
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.subQuestionAnswersByUser(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.userStatsByUser(userId) });
    },
  });
};

export const useCompleteQuiz = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ chapterId, userId, xp, coins }: { chapterId: number; userId: string; xp: number; coins: number }) => {
      const { data, error } = await supabase
        .from('user_stats')
        .insert([
          {
            chapter_id: chapterId,
            user_id: userId,
            completed_at: new Date().toISOString(),
            xp_earned: xp,
            coins_earned: coins
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async ({ chapterId, userId, xp, coins }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.userStatsByUser(userId) });
      const previousStats = queryClient.getQueryData<UserStats>(queryKeys.userStatsByUser(userId));
      
      if (previousStats) {
        const currentXP = previousStats.total_xp ?? 0;
        const currentCoins = previousStats.total_coins ?? 0;
        
        queryClient.setQueryData<UserStats>(queryKeys.userStatsByUser(userId), {
          ...previousStats,
          total_xp: currentXP + xp,
          total_coins: currentCoins + coins
        });
      }

      return { previousStats };
    },
    onError: (_, { userId }, context) => {
      if (context?.previousStats) {
        queryClient.setQueryData(queryKeys.userStatsByUser(userId), context.previousStats);
      }
    },
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.userStatsByUser(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.answeredQuestionsByUser(userId, 0) });
    },
  });
};

export const useAddXP = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, xp }: { userId: string; xp: number }) => {
      const { data, error } = await supabase
        .from('user_stats')
        .update({ total_xp: xp })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async ({ userId, xp }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.userStatsByUser(userId) });
      const previousStats = queryClient.getQueryData<UserStats>(queryKeys.userStatsByUser(userId));
      
      if (previousStats) {
        queryClient.setQueryData<UserStats>(queryKeys.userStatsByUser(userId), {
          ...previousStats,
          total_xp: xp
        });
      }

      return { previousStats };
    },
    onError: (_, { userId }, context) => {
      if (context?.previousStats) {
        queryClient.setQueryData(queryKeys.userStatsByUser(userId), context.previousStats);
      }
    },
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.userStatsByUser(userId) });
    },
  });
};

export const useAddCoins = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, coins }: { userId: string; coins: number }) => {
      const { data, error } = await supabase
        .from('user_stats')
        .update({ total_coins: coins })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async ({ userId, coins }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.userStatsByUser(userId) });
      const previousStats = queryClient.getQueryData<UserStats>(queryKeys.userStatsByUser(userId));
      
      if (previousStats) {
        queryClient.setQueryData<UserStats>(queryKeys.userStatsByUser(userId), {
          ...previousStats,
          total_coins: coins
        });
      }

      return { previousStats };
    },
    onError: (_, { userId }, context) => {
      if (context?.previousStats) {
        queryClient.setQueryData(queryKeys.userStatsByUser(userId), context.previousStats);
      }
    },
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.userStatsByUser(userId) });
    },
  });
};

export const useQuizData = (chapterId: number, userId: string) => {
  const queryClient = useQueryClient();
  const eventBus = useQuizEventBus.getState();

  // Fragen abrufen
  const { data: questions, isLoading: isQuestionsLoading } = useQuery({
    queryKey: [queryKeys.questions, chapterId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('chapter_id', chapterId);
      
      if (error) throw error;
      return data as Question[];
    }
  });

  // Unterfragen abrufen
  const { data: subQuestions, isLoading: isSubQuestionsLoading } = useQuery({
    queryKey: [queryKeys.subQuestions, chapterId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cases_subquestions')
        .select('*')
        .eq('question_id', chapterId);
      
      if (error) throw error;
      return data as SubQuestion[];
    }
  });

  // Beantwortete Fragen abrufen
  const { data: answeredQuestions } = useQuery({
    queryKey: [queryKeys.answeredQuestions, userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('answered_questions')
        .select('*')
        .eq('user_id', userId)
        .in('question_id', questions?.map(q => q.id) || []);

      if (error) throw error;
      return data as QuizAnswer[];
    },
    enabled: !!questions,
  });

  // Benutzerstatistiken abrufen
  const { data: userStats } = useQuery({
    queryKey: [queryKeys.userStats, userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      return data as UserStats;
    },
  });

  // Sound-Funktionen
  const playCorrectSound = () => {
    const audio = new Audio(correctSound);
    audio.play();
  };

  const playWrongSound = () => {
    const audio = new Audio(wrongSound);
    audio.play();
  };

  // Antwort verarbeiten
  const handleAnswer = async (question: Question, answer: string): Promise<boolean> => {
    let isCorrect = false;
    
    switch (question.type) {
      case "true_false":
        const dbAnswer = (question["Richtige Antwort"] || "").toLowerCase().trim();
        const isDbAnswerTrue = ["true", "wahr", "1", "ja", "richtig"].includes(dbAnswer);
        isCorrect = answer === "true" ? isDbAnswerTrue : !isDbAnswerTrue;
        break;
          
      case "lueckentext":
        isCorrect = answer === "true";
        break;
          
      case "open_question":
        isCorrect = answer === "true";
        break;
          
      case "multiple_choice":
        isCorrect = answer === "true";
        break;
          
      default:
        const normalizedDbAnswer = (question["Richtige Antwort"] || "").toLowerCase().trim();
        isCorrect = answer.toLowerCase().trim() === normalizedDbAnswer;
    }

    // Event publizieren
    eventBus.emit({
      type: 'ANSWER_SUBMITTED',
      payload: {
        question_id: question.id,
        user_id: userId,
        is_correct: isCorrect,
        answered_at: new Date().toISOString()
      }
    });

    return isCorrect;
  };

  // XP berechnen
  const computeXp = (isCorrect: boolean, streak: string | number): number => {
    const streakNumber = typeof streak === 'string' ? parseInt(streak, 10) : streak;
    const baseXp = isCorrect ? 10 : 0;
    const streakBonus = isCorrect ? Math.min(streakNumber, 5) * 2 : 0;
    return baseXp + streakBonus;
  };

  // Mögliche XP berechnen
  const computePossibleXp = async (chapterId: number): Promise<number> => {
    const { data: questions, error } = await supabase
      .from('questions')
      .select('id, type')
      .eq('chapter_id', chapterId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return (questions?.length || 0) * 10;
  };

  // Antwort speichern
  const { mutateAsync: saveAnswer } = useMutation({
    mutationFn: async (answer: Omit<QuizAnswer, 'id' | 'answered_at'>) => {
      const { data, error } = await supabase
        .from('answered_questions')
        .insert({
          user_id: answer.user_id,
          question_id: answer.question_id,
          is_correct: answer.is_correct,
          answered_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as QuizAnswer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKeys.quizAnswers] });
    }
  });

  return {
    questions,
    subQuestions,
    answeredQuestions,
    userStats,
    isQuestionsLoading,
    isSubQuestionsLoading,
    handleAnswer,
    computeXp,
    computePossibleXp,
    playCorrectSound,
    playWrongSound,
    saveAnswer
  };
}; 