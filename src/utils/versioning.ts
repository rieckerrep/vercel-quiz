import { supabase } from '../lib/supabaseClient';
import { Database } from '../types/supabase';

type TableName = keyof Omit<Database['public']['Tables'], 'versions'>;
type VersionTable = Database['public']['Tables']['versions'];

interface VersionConfig {
  tables: TableName[];
  maxVersions: number;
}

export class VersioningService {
  private static instance: VersioningService;
  private config: VersionConfig;

  private constructor(config: VersionConfig) {
    this.config = config;
  }

  public static getInstance(config: VersionConfig): VersioningService {
    if (!VersioningService.instance) {
      VersioningService.instance = new VersioningService(config);
    }
    return VersioningService.instance;
  }

  private async createVersion(table: TableName, data: any[]): Promise<void> {
    const version: VersionTable['Insert'] = {
      table_name: table,
      data: data,
      created_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('versions')
      .insert(version);

    if (error) throw error;
  }

  private async getLatestVersion(table: TableName): Promise<any[] | null> {
    const { data, error } = await supabase
      .from('versions')
      .select('data')
      .eq('table_name', table)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) throw error;
    return data?.data || null;
  }

  private async cleanupOldVersions(): Promise<void> {
    for (const table of this.config.tables) {
      const { data, error } = await supabase
        .from('versions')
        .select('id')
        .eq('table_name', table)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > this.config.maxVersions) {
        const idsToDelete = data
          .slice(this.config.maxVersions)
          .map(version => version.id);

        const { error: deleteError } = await supabase
          .from('versions')
          .delete()
          .in('id', idsToDelete);

        if (deleteError) throw deleteError;
      }
    }
  }

  public async saveVersion(table: TableName, data: any[]): Promise<void> {
    await this.createVersion(table, data);
    await this.cleanupOldVersions();
  }

  public async restoreVersion(table: TableName): Promise<void> {
    const data = await this.getLatestVersion(table);
    if (!data) throw new Error(`Keine Version für Tabelle ${table} gefunden`);

    const { error } = await supabase
      .from(table)
      .upsert(data);

    if (error) throw error;
  }
}

// Beispiel für die Verwendung:
export const versioningService = VersioningService.getInstance({
  tables: ['user_stats', 'answered_questions'] as TableName[],
  maxVersions: 10
}); 