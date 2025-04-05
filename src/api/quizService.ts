import { supabase } from '../supabaseClient';
import { apiCall, ApiResponse } from './apiClient';
import { Database } from '../types/supabase';
import { userService } from './userService';
import { ERROR_MESSAGES } from '../constants/errorMessages';
import { notificationService } from '../services/notificationService';

type Question = Database['public']['Tables']['questions']['Row'];
type Subquestion = Database['public']['Tables']['cases_subquestions']['Row'];
type AnsweredQuestion = Database['public']['Tables']['answered_questions']['Row'];
type AnsweredSubquestion = Database['public']['Tables']['answered_cases_subquestions']['Row'];

// Benutzerdefinierter Typ für Quiz-Abschlüsse
interface QuizCompletion {
  id: number;
  user_id: string;
  chapter_id: number;
  xp_earned: number;
  completed_at: string;
}

/**
 * Quiz-Dienst für Fragen und Antworten
 */
export const quizService = {
  /**
   * Fragen für ein Kapitel abrufen
   */
  fetchQuestions: async (chapterId: number): Promise<ApiResponse<Question[]>> => {
    return apiCall(async () => {
      try {
        const { data, error } = await supabase
          .from('questions')
          .select('*')
          .eq('chapter_id', chapterId);

        if (error) {
          notificationService.error(ERROR_MESSAGES.QUIZ.LOAD_QUESTIONS);
          console.error('Fehler beim Laden der Fragen:', error);
          return { data: null, error };
        }

        if (!data || data.length === 0) {
          notificationService.info(ERROR_MESSAGES.QUIZ.NO_QUESTIONS);
        }

        return { data, error: null };
      } catch (error) {
        notificationService.error(ERROR_MESSAGES.GENERAL.UNKNOWN);
        console.error('Unerwarteter Fehler beim Laden der Fragen:', error);
        return { data: null, error: error as Error };
      }
    });
  },

  /**
   * Unterfragen für eine Frage abrufen
   */
  fetchSubquestions: async (questionId: number): Promise<ApiResponse<Subquestion[]>> => {
    return apiCall(async () => {
      const { data, error } = await supabase
        .from('cases_subquestions')
        .select('*')
        .eq('question_id', questionId);

      return { data, error };
    });
  },

  /**
   * Frage als beantwortet markieren
   */
  answerQuestion: async (
    userId: string,
    questionId: number,
    isCorrect: boolean
  ): Promise<ApiResponse<AnsweredQuestion>> => {
    return apiCall(async () => {
      // Prüfen, ob die Frage bereits beantwortet wurde
      const { data: existingAnswers, error: checkError } = await supabase
        .from('answered_questions')
        .select('id, question_id')
        .eq('user_id', userId)
        .eq('question_id', questionId);

      if (checkError) {
        return { data: null, error: checkError };
      }

      if (existingAnswers && existingAnswers.length > 0) {
        return { data: existingAnswers[0], error: null };
      }

      // Neue Antwort erstellen
      const { data, error } = await supabase
        .from('answered_questions')
        .insert({
          user_id: userId,
          question_id: questionId,
          is_correct: isCorrect,
          answered_at: new Date().toISOString()
        })
        .select()
        .single();

      return { data, error };
    });
  },

  /**
   * Unterfrage als beantwortet markieren
   */
  answerSubquestion: async (
    userId: string,
    subquestionId: number,
    isCorrect: boolean
  ): Promise<ApiResponse<AnsweredSubquestion>> => {
    return apiCall(async () => {
      console.log("Attempting to answer subquestion:", {
        userId,
        subquestionId,
        isCorrect
      });

      // Prüfen, ob die Unterfrage bereits beantwortet wurde
      const { data: existingAnswer, error: checkError } = await supabase
        .from('answered_cases_subquestions')
        .select('id, user_id, subquestion_id, is_correct')
        .eq('user_id', userId)
        .eq('subquestion_id', subquestionId)
        .single();

      if (checkError) {
        if (checkError.code === 'PGRST116') {
          console.log("No existing answer found, proceeding with creation");
        } else {
          console.error("Error checking for existing answer:", checkError);
          return { data: null, error: checkError };
        }
      }

      if (existingAnswer) {
        console.log("Existing answer found:", existingAnswer);
        return { data: existingAnswer, error: null };
      }

      console.log("Creating new answer entry");
      
      // Neue Antwort erstellen
      const { data, error } = await supabase
        .from('answered_cases_subquestions')
        .insert([
          {
            user_id: userId,
            subquestion_id: subquestionId,
            is_correct: isCorrect
          }
        ])
        .select()
        .single();

      if (error) {
        console.error("Error creating answer:", error);
      } else {
        console.log("Successfully created answer:", data);
      }

      return { data, error };
    });
  },

  /**
   * Beantwortete Fragen eines Benutzers abrufen
   */
  fetchAnsweredQuestions: async (userId: string): Promise<ApiResponse<AnsweredQuestion[]>> => {
    return apiCall(async () => {
      const { data, error } = await supabase
        .from('answered_questions')
        .select('*')
        .eq('user_id', userId);

      return { data, error };
    });
  },

  /**
   * Beantwortete Unterfragen eines Benutzers abrufen
   */
  fetchAnsweredSubquestions: async (userId: string): Promise<ApiResponse<AnsweredSubquestion[]>> => {
    return apiCall(async () => {
      console.log("Fetching answered subquestions for user:", userId);
      
      const { data, error } = await supabase
        .from('answered_cases_subquestions')
        .select('id, user_id, subquestion_id, is_correct')
        .eq('user_id', userId);

      if (error) {
        console.error("Error fetching answered subquestions:", error);
      } else {
        console.log("Fetched answered subquestions:", data);
      }

      return { data, error };
    });
  },

  /**
   * Multiple-Choice-Optionen für eine Frage abrufen
   */
  fetchMultipleChoiceOptions: async (questionId: number): Promise<ApiResponse<any[]>> => {
    return apiCall(async () => {
      const { data, error } = await supabase
        .from('multiple_choice_options')
        .select('*')
        .eq('question_id', questionId);

      return { data, error };
    });
  },

  /**
   * Drag & Drop-Gruppen für eine Frage abrufen
   */
  fetchDragDropGroups: async (questionId: number): Promise<ApiResponse<any[]>> => {
    return apiCall(async () => {
      const { data, error } = await supabase
        .from('dragdrop_groups')
        .select('*')
        .eq('question_id', questionId);

      return { data, error };
    });
  },

  /**
   * Drag & Drop-Paare für eine Gruppe abrufen
   */
  fetchDragDropPairs: async (groupId: number): Promise<ApiResponse<any[]>> => {
    return apiCall(async () => {
      const { data, error } = await supabase
        .from('dragdrop_pairs')
        .select('*')
        .eq('group_id', groupId);

      return { data, error };
    });
  },

  /**
   * Sequenz-Items für eine Frage abrufen
   */
  fetchSequenceItems: async (questionId: number): Promise<ApiResponse<any[]>> => {
    return apiCall(async () => {
      const { data, error } = await supabase
        .from('sequence_items')
        .select('*')
        .eq('question_id', questionId);

      return { data, error };
    });
  },

  /**
   * Kapitel abrufen
   */
  fetchChapters: async (courseId: number): Promise<ApiResponse<any[]>> => {
    return apiCall(async () => {
      const { data, error } = await supabase
        .from('chapters')
        .select('*')
        .eq('course_id', courseId);

      return { data, error };
    });
  },

  /**
   * Kurse abrufen
   */
  fetchCourses: async (subjectId: number): Promise<ApiResponse<any[]>> => {
    return apiCall(async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('subject_id', subjectId);

      return { data, error };
    });
  },

  /**
   * Fächer abrufen
   */
  fetchSubjects: async (): Promise<ApiResponse<any[]>> => {
    return apiCall(async () => {
      const { data, error } = await supabase.from('subjects').select('*');

      return { data, error };
    });
  },

  /**
   * Mögliche XP für eine Frage berechnen
   */
  computePossibleXp: async (questionId: number): Promise<ApiResponse<number>> => {
    return apiCall(async () => {
      // Hauptfrage XP
      const { data: question, error: questionError } = await supabase
        .from('questions')
        .select('xp_reward')
        .eq('id', questionId)
        .single();

      if (questionError) {
        return { data: null, error: questionError };
      }

      // Unterfragen XP
      const { data: subquestions, error: subquestionsError } = await supabase
        .from('cases_subquestions')
        .select('xp_reward')
        .eq('question_id', questionId);

      if (subquestionsError) {
        return { data: null, error: subquestionsError };
      }

      // Gesamt-XP berechnen
      const mainXp = question?.xp_reward || 0;
      const subXp = subquestions?.reduce((sum, sub) => sum + (sub.xp_reward || 0), 0) || 0;

      return { data: mainXp + subXp, error: null };
    });
  },

  /**
   * Quiz-Abschluss protokollieren
   */
  logQuizCompleted: async (userId: string, chapterId: number, xpEarned: number): Promise<ApiResponse<QuizCompletion>> => {
    return apiCall(async () => {
      // Quiz-Abschluss protokollieren
      const { data, error } = await supabase
        .from('quiz_completions')
        .insert([
          {
            user_id: userId,
            chapter_id: chapterId,
            xp_earned: xpEarned,
            completed_at: new Date().toISOString()
          }
        ])
        .select()
        .single();

      if (error) {
        return { data: null, error };
      }

      // Benutzerstatistiken aktualisieren
      await userService.addXp(userId, xpEarned);

      return { data, error: null };
    });
  }
};

export default quizService; 