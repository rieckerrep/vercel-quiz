import { supabase } from '../lib/supabaseClient';
import { Database } from '../types/supabase';

type TableName = keyof Omit<Database['public']['Tables'], 'versions'>;

interface BackupConfig {
  tables: TableName[];
  interval: number;
  maxBackups: number;
}

export class BackupService {
  private static instance: BackupService;
  private config: BackupConfig;

  private constructor(config: BackupConfig) {
    this.config = config;
  }

  public static getInstance(config: BackupConfig): BackupService {
    if (!BackupService.instance) {
      BackupService.instance = new BackupService(config);
    }
    return BackupService.instance;
  }

  private async backupTable(table: TableName): Promise<any[]> {
    const { data, error } = await supabase
      .from(table)
      .select('*');

    if (error) throw error;
    return data || [];
  }

  private async restoreTable(table: TableName, data: any[]): Promise<void> {
    const { error: checkError } = await supabase
      .from(table)
      .select('id')
      .limit(1);

    if (checkError) {
      throw new Error(`Tabelle ${table} existiert nicht`);
    }

    const { error } = await supabase
      .from(table)
      .upsert(data);

    if (error) throw error;
  }

  public async createBackup(): Promise<Record<TableName, any[]>> {
    const backup: Partial<Record<TableName, any[]>> = {};

    for (const table of this.config.tables) {
      backup[table] = await this.backupTable(table);
    }

    return backup as Record<TableName, any[]>;
  }

  public async restoreBackup(backup: Record<TableName, any[]>): Promise<void> {
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