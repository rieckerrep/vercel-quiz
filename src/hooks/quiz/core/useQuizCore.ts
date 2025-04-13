import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { Question, Answer, SubQuestion, SubAnswer, AnsweredQuestion, AnsweredSubQuestion } from '../types';
import { queryKeys } from '../queryKeys';
import { useSupabaseTable } from '../../useSupabaseTable';
import { Database } from '../../../types/supabase';

// Core Quiz Data Hooks
export const useQuestions = () => {
  return useQuery({
    queryKey: [queryKeys.questions],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .order('id');
      
      if (error) throw error;
      return data as Question[];
    }
  });
};

export const useAnsweredQuestions = (userId: string) => {
  return useQuery({
    queryKey: [queryKeys.answeredQuestions, userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('answered_questions')
        .select('*')
        .eq('user_id', userId);
      
      if (error) throw error;
      return data as Answer[];
    }
  });
};

export const useSubQuestions = (questionId: number) => {
  return useQuery({
    queryKey: [queryKeys.subQuestions, questionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cases_subquestions')
        .select('*')
        .eq('question_id', questionId)
        .order('id');
      
      if (error) throw error;
      return data as SubQuestion[];
    }
  });
};

export const useSubAnswers = (userId: string, subQuestionId: number) => {
  return useQuery({
    queryKey: [queryKeys.subAnswers, userId, subQuestionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('answered_cases_subquestions')
        .select('*')
        .eq('user_id', userId)
        .eq('subquestion_id', subQuestionId);
      
      if (error) throw error;
      return data as SubAnswer[];
    }
  });
};

// Core Quiz State Hooks
export const useQuizState = () => {
  const queryClient = useQueryClient();
  
  const saveAnswer = useMutation({
    mutationFn: async ({ questionId, isCorrect, userId, chapterId }: { 
      questionId: number; 
      isCorrect: boolean; 
      userId: string;
      chapterId: number;
    }) => {
      const { error } = await supabase
        .from('answered_questions')
        .insert({
          question_id: questionId,
          is_correct: isCorrect,
          user_id: userId
        });
      
      if (error) throw error;
    },
    onMutate: async ({ questionId, isCorrect, userId, chapterId }) => {
      await queryClient.cancelQueries({ queryKey: [queryKeys.answeredQuestions, userId] });
      
      const previousAnswers = queryClient.getQueryData<Answer[]>([queryKeys.answeredQuestions, userId]) || [];
      
      const newAnswer: Answer = {
        id: Date.now(), // Temporäre ID
        question_id: questionId,
        is_correct: isCorrect,
        user_id: userId,
        answered_at: new Date().toISOString(),
        chapter_id: chapterId
      };
      
      queryClient.setQueryData<Answer[]>(
        [queryKeys.answeredQuestions, userId],
        [...previousAnswers, newAnswer]
      );
      
      return { previousAnswers };
    },
    onError: (err, variables, context) => {
      if (context?.previousAnswers) {
        queryClient.setQueryData(
          [queryKeys.answeredQuestions, variables.userId],
          context.previousAnswers
        );
      }
    }
  });

  const saveSubAnswer = useMutation({
    mutationFn: async ({ subQuestionId, isCorrect, userId, chapterId }: {
      subQuestionId: number;
      isCorrect: boolean;
      userId: string;
      chapterId: number;
    }) => {
      const { error } = await supabase
        .from('answered_cases_subquestions')
        .insert({
          subquestion_id: subQuestionId,
          is_correct: isCorrect,
          user_id: userId
        });
      
      if (error) throw error;
    },
    onMutate: async ({ subQuestionId, isCorrect, userId, chapterId }) => {
      await queryClient.cancelQueries({ 
        queryKey: [queryKeys.subAnswers, userId, subQuestionId] 
      });
      
      const previousAnswers = queryClient.getQueryData<SubAnswer[]>([
        queryKeys.subAnswers, 
        userId, 
        subQuestionId
      ]) || [];
      
      const newAnswer: SubAnswer = {
        id: Date.now(), // Temporäre ID
        subquestion_id: subQuestionId,
        is_correct: isCorrect,
        user_id: userId
      };
      
      queryClient.setQueryData<SubAnswer[]>(
        [queryKeys.subAnswers, userId, subQuestionId],
        [...previousAnswers, newAnswer]
      );
      
      return { previousAnswers };
    },
    onError: (err, variables, context) => {
      if (context?.previousAnswers) {
        queryClient.setQueryData(
          [queryKeys.subAnswers, variables.userId, variables.subQuestionId],
          context.previousAnswers
        );
      }
    }
  });

  return {
    saveAnswer,
    saveSubAnswer
  };
};

export const useQuizCore = () => {
  const { data: profile, isLoading: isProfileLoading } = useSupabaseTable<Database['public']['Tables']['profiles']['Row']>(
    'profiles',
    'id'
  );

  const { data: stats, isLoading: isStatsLoading } = useSupabaseTable<Database['public']['Tables']['user_stats']['Row']>(
    'user_stats',
    'user_id'
  );

  const { data: questions, isLoading: isQuestionsLoading } = useSupabaseTable<Database['public']['Tables']['questions']['Row']>(
    'questions',
    'chapter_id'
  );

  const { data: answeredQuestions, isLoading: isAnsweredQuestionsLoading } = useSupabaseTable<Database['public']['Tables']['answered_questions']['Row']>(
    'answered_questions',
    'user_id'
  );

  const { data: subAnswers, isLoading: isSubAnswersLoading } = useSupabaseTable<Database['public']['Tables']['sub_answers']['Row']>(
    'sub_answers',
    'user_id'
  );

  return {
    profile,
    stats,
    questions,
    answeredQuestions,
    subAnswers,
    isLoading: isProfileLoading || isStatsLoading || isQuestionsLoading || isAnsweredQuestionsLoading || isSubAnswersLoading
  };
}; 