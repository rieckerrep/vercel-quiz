import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { queryKeys } from './queryKeys';
import { Question, QuizAnswer, SubQuestion, UserStats, AnsweredSubQuestion } from '../../types/quiz';
import correctSound from '../../assets/sounds/correct.mp3';
import wrongSound from '../../assets/sounds/wrong.mp3';
import { useQuizEventBus } from './quizEventBus';
import { Answer, SubAnswer } from './types';
import { Database } from '@/lib/supabase';
import { useEffect } from 'react';

// Definiere den Typ für das Einfügen von Antworten basierend auf der Datenbankstruktur
type QuizAnswerInsert = Database['public']['Tables']['answered_questions']['Insert'];

export const useQuestions = (chapterId: number) => {
  const queryClient = useQueryClient();
  
  return useQuery<Question[]>({
    queryKey: queryKeys.questions(chapterId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('questions')
        .select(`
          id,
          Frage,
          "Antwort A",
          "Antwort B",
          "Antwort C",
          "Antwort D",
          "Richtige Antwort",
          Begruendung,
          type,
          chapter_id,
          course_id,
          subquestions_count
        `)
        .eq('chapter_id', chapterId)
        .order('id', { ascending: true });

      if (error) {
        console.error('Fehler beim Laden der Fragen:', error);
        throw new Error('Fragen konnten nicht geladen werden');
      }
      
      if (!data || data.length === 0) {
        throw new Error('Keine Fragen für dieses Kapitel gefunden');
      }
      
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 Minuten
    gcTime: 60 * 60 * 1000, // 1 Stunde
    refetchOnWindowFocus: false,
    retry: 1, // Reduzierte Wiederholungsversuche
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    enabled: !!chapterId // Nur ausführen wenn chapterId vorhanden
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
    staleTime: 5 * 60 * 1000, // 5 Minuten
    gcTime: 30 * 60 * 1000, // 30 Minuten
    refetchOnWindowFocus: false,
    enabled: !!userId // Nur ausführen wenn userId vorhanden
  });
};

export const useSaveAnswers = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (answers: Array<{ questionId: number; isCorrect: boolean; userId: string; chapterId: number }>) => {
      const { data, error } = await supabase
        .from('answered_questions')
        .insert(answers.map(answer => ({
          question_id: answer.questionId,
          is_correct: answer.isCorrect,
          user_id: answer.userId,
          answered_at: new Date().toISOString(),
          chapter_id: answer.chapterId
        })))
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      // Nur die relevanten Queries invalidieren
      const userId = variables[0]?.userId;
      if (userId) {
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.answeredQuestions(userId),
          exact: true 
        });
      }
    }
  });
};

export const useSaveSubAnswers = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (answers: Array<{ subQuestionId: number; isCorrect: boolean; userId: string; chapterId: number }>) => {
      const { error } = await supabase
        .from('answered_cases_subquestions')
        .insert(answers.map(answer => ({
          subquestion_id: answer.subQuestionId,
          user_id: answer.userId,
          is_correct: answer.isCorrect,
          answered_at: new Date().toISOString()
        })));

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      const userId = variables[0]?.userId;
      if (userId) {
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.answeredSubQuestionsByUser(userId),
          exact: true 
        });
      }
    }
  });
};

export const useUpdateXP = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ userId, amount }: { userId: string; amount: number }) => {
      const { data: currentStats, error: fetchError } = await supabase
        .from('user_stats')
        .select('total_xp')
        .eq('user_id', userId)
        .single();

      if (fetchError) throw fetchError;

      const newTotalXP = (currentStats?.total_xp || 0) + amount;
      
      const { error } = await supabase
        .from('user_stats')
        .update({ 
          total_xp: newTotalXP,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.userStatsByUser(userId),
        exact: true 
      });
    }
  });
};

export const useCompleteQuiz = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ chapterId, userId }: { chapterId: number; userId: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Nicht angemeldet');

      const { data: currentStats, error: fetchError } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (fetchError) throw fetchError;

      const newQuestionsAnswered = (currentStats?.questions_answered || 0) + 1;
      const newTotalXp = (currentStats?.total_xp || 0) + 100;
      const newTotalCoins = (currentStats?.total_coins || 0) + 50;
      const newStreak = currentStats?.streak || 0;
      const newCorrectAnswers = (currentStats?.correct_answers || 0) + 1;
      const newLevel = Math.floor(newTotalXp / 1000) + 1;

      const { error } = await supabase
        .from('user_stats')
        .update({ 
          last_played: new Date().toISOString(),
          questions_answered: newQuestionsAnswered,
          total_xp: newTotalXp,
          total_coins: newTotalCoins,
          streak: newStreak,
          correct_answers: newCorrectAnswers,
          level: newLevel,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: (_, { userId, chapterId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.userStatsByUser(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.quizProgress(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.answeredQuestionsByUser(userId) });
    }
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

export const useSubmitAnswer = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      userId, 
      questionId, 
      selectedOption, 
      isCorrect,
      chapterId
    }: { 
      userId: string; 
      questionId: number; 
      selectedOption: string; 
      isCorrect: boolean;
      chapterId: number;
    }) => {
      const { error } = await supabase
        .from('answered_questions')
        .insert({
          user_id: userId,
          question_id: questionId,
          selected_option: selectedOption,
          is_correct: isCorrect,
          answered_at: new Date().toISOString(),
          chapter_id: chapterId
        });

      if (error) {
        console.error('Fehler beim Speichern der Antwort:', error);
        throw error;
      }
    },
    onMutate: async ({ userId, isCorrect }) => {
      // Aktuelle Stats abrufen
      const previousStats = queryClient.getQueryData<UserStats>(queryKeys.userStatsByUser(userId));
      
      // Optimistisch aktualisieren
      if (previousStats) {
        queryClient.setQueryData<UserStats>(queryKeys.userStatsByUser(userId), {
          ...previousStats,
          total_xp: (previousStats.total_xp || 0) + (isCorrect ? 10 : 0),
          questions_answered: (previousStats.questions_answered || 0) + 1,
          correct_answers: (previousStats.correct_answers || 0) + (isCorrect ? 1 : 0)
        });
      }
      
      return { previousStats };
    },
    onError: (_, { userId }, context) => {
      // Bei Fehler zurücksetzen
      if (context?.previousStats) {
        queryClient.setQueryData(queryKeys.userStatsByUser(userId), context.previousStats);
      }
    },
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.userStatsByUser(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.answeredQuestions(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.quizProgress(userId) });
    }
  });
};

export const useSaveProgress = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      userId, 
      chapterId, 
      progress 
    }: { 
      userId: string; 
      chapterId: number; 
      progress: number 
    }) => {
      const { error } = await supabase
        .from('quiz_progress')
        .upsert({
          user_id: userId,
          chapter_id: chapterId,
          progress,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      return { userId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.quizProgress(data.userId) });
    }
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
    queryKey: queryKeys.userStatsByUser(userId),
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
    const answerEvent = {
      question_id: question.id,
      user_id: userId,
      is_correct: isCorrect,
      answered_at: new Date().toISOString(),
      chapter_id: chapterId
    } satisfies QuizAnswerInsert;

    eventBus.emit({
      type: 'ANSWER_SUBMITTED',
      payload: answerEvent
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

  const { mutateAsync: submitAnswer } = useSubmitAnswer();

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
    submitAnswer
  };
};

// Neue Funktion zum Prefetchen der nächsten Fragen
export const usePrefetchNextQuestions = (currentChapterId: number) => {
  const queryClient = useQueryClient();
  
  useEffect(() => {
    const nextChapterId = currentChapterId + 1;
    
    // Prüfen ob das nächste Kapitel bereits im Cache ist
    const cachedData = queryClient.getQueryData(queryKeys.questions(nextChapterId));
    if (cachedData) return;

    // Prefetch nächstes Kapitel
    queryClient.prefetchQuery({
      queryKey: queryKeys.questions(nextChapterId),
      queryFn: async () => {
        const { data, error } = await supabase
          .from('questions')
          .select(`
            id,
            Frage,
            "Antwort A",
            "Antwort B",
            "Antwort C",
            "Antwort D",
            "Richtige Antwort",
            Begruendung,
            type,
            chapter_id,
            course_id,
            subquestions_count
          `)
          .eq('chapter_id', nextChapterId)
          .order('id', { ascending: true });

        if (error) throw error;
        return data as Question[];
      }
    });
  }, [currentChapterId, queryClient]);
};