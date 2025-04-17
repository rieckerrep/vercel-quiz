import { supabase } from '../lib/supabaseClient';
import { Database } from '../types/supabase';

interface ProgressItem {
  question_id: number;
  is_answered: boolean;
  is_correct: boolean;
}

type Progress = ProgressItem[];

interface ProgressArgs {
  chapter_id: number;
  user_id: string;
}

export const progressService = {
  /**
   * Ruft den Fortschritt eines Benutzers für ein bestimmtes Kapitel ab
   * @param userId Die ID des Benutzers
   * @param chapterId Die ID des Kapitels
   * @returns Eine Liste mit dem Fortschritt pro Frage
   */
  async getUserProgress(userId: string, chapterId: number): Promise<Progress> {
    const args: ProgressArgs = {
      chapter_id: chapterId,
      user_id: userId
    };

    try {
      const { data, error } = await (supabase.rpc as any)('get_user_progress', args);

      if (error) {
        console.error('Fehler beim Abrufen des Fortschritts:', error);
        throw error;
      }

      if (!data) {
        return [];
      }

      return data as unknown as Progress;
    } catch (error) {
      console.error('Fehler beim Abrufen des Fortschritts:', error);
      return [];
    }
  }
}; 