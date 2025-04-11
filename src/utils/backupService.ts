import { supabase } from '../api/supabaseClient';
import { Database } from '../types/supabase';

type TableName = keyof Database['public']['Tables'];

interface BackupConfig {
  tables: TableName[];
  includeData: boolean;
}

export class BackupService {
  private static async backupTable(table: TableName): Promise<any> {
    const { data, error } = await supabase
      .from(table)
      .select('*');

    if (error) throw error;
    return data;
  }

  private static async restoreTable(table: TableName, data: any[]): Promise<void> {
    // Überprüfen ob Tabelle existiert
    const { error: checkError } = await supabase
      .from(table)
      .select('id')
      .limit(1);

    if (checkError) {
      throw new Error(`Tabelle ${table} existiert nicht`);
    }

    // Daten wiederherstellen
    const { error } = await supabase
      .from(table)
      .upsert(data);

    if (error) throw error;
  }

  static async createBackup(config: BackupConfig): Promise<Record<TableName, any[]>> {
    const backup: Record<TableName, any[]> = {} as Record<TableName, any[]>;

    for (const table of config.tables) {
      backup[table] = await this.backupTable(table);
    }

    return backup;
  }

  static async restoreBackup(backup: Record<TableName, any[]>): Promise<void> {
    for (const [table, data] of Object.entries(backup)) {
      await this.restoreTable(table as TableName, data);
    }
  }
}

// Beispiel für die Verwendung:
export const backupService = BackupService.getInstance({
  tables: ['user_stats', 'answered_questions', 'quiz_progress'] as TableName[],
  interval: 60, // 1 Stunde
  maxBackups: 24 // 24 Backups behalten
}); 