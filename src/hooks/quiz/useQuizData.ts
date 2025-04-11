import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../supabaseClient';
import { queryKeys } from './queryKeys';
import { Question, QuizAnswer, SubQuestion, UserStats } from '../../types/quiz';
import correctSound from '../../assets/sounds/correct.mp3';
import wrongSound from '../../assets/sounds/wrong.mp3';
import useQuizEventBus from './quizEventBus';

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
      return data;
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
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.answeredQuestions(userId) });
    },
  });
};

export const useQuizData = (chapterId: number, userId: string) => {
  const queryClient = useQueryClient();
  const eventBus = useQuizEventBus();

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
    eventBus.publish({
      type: 'ANSWER_SUBMITTED',
      payload: {
        question_id: question.id,
        user_id: userId,
        is_correct: isCorrect,
        answered_at: new Date().toISOString(),
        id: 0 // Wird von der Datenbank gesetzt
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