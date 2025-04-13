import { supabase } from '../lib/supabaseClient';
import { Database } from '../types/supabase';

type TableName = 'questions' | 'cases_subquestions' | 'chapters' | 'courses';

type BackupData = {
  questions: Database['public']['Tables']['questions']['Row'][];
  subquestions: Database['public']['Tables']['cases_subquestions']['Row'][];
  chapters: Database['public']['Tables']['chapters']['Row'][];
  courses: Database['public']['Tables']['courses']['Row'][];
};

class BackupService {
  private static instance: BackupService;
  private backupData: BackupData | null = null;

  private constructor() {}

  public static getInstance(): BackupService {
    if (!BackupService.instance) {
      BackupService.instance = new BackupService();
    }
    return BackupService.instance;
  }

  private static async backupTable(table: TableName): Promise<any> {
    const { data, error } = await supabase
      .from(table)
      .select('*');

    if (error) {
      console.error(`Fehler beim Backup von Tabelle ${table}:`, error);
      return null;
    }

    return data;
  }

  private static async restoreTable(table: TableName, data: any[]): Promise<boolean> {
    const { error } = await supabase
      .from(table)
      .upsert(data);

    if (error) {
      console.error(`Fehler beim Wiederherstellen von Tabelle ${table}:`, error);
      return false;
    }

    return true;
  }

  public async createBackup(): Promise<BackupData | null> {
    try {
      const questions = await BackupService.backupTable('questions');
      const subquestions = await BackupService.backupTable('cases_subquestions');
      const chapters = await BackupService.backupTable('chapters');
      const courses = await BackupService.backupTable('courses');

      this.backupData = {
        questions,
        subquestions,
        chapters,
        courses
      };

      return this.backupData;
    } catch (error) {
      console.error('Fehler beim Erstellen des Backups:', error);
      return null;
    }
  }

  public async restoreBackup(backupData: BackupData): Promise<boolean> {
    try {
      const results = await Promise.all([
        BackupService.restoreTable('questions', backupData.questions),
        BackupService.restoreTable('cases_subquestions', backupData.subquestions),
        BackupService.restoreTable('chapters', backupData.chapters),
        BackupService.restoreTable('courses', backupData.courses)
      ]);

      return results.every(result => result);
    } catch (error) {
      console.error('Fehler beim Wiederherstellen des Backups:', error);
      return false;
    }
  }

  public getBackupData(): BackupData | null {
    return this.backupData;
  }
}

// Beispiel für die Verwendung:
export const backupService = BackupService.getInstance(); 