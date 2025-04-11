import { supabase } from '../api/supabaseClient';
import { Database } from '../types/supabase';

type TableName = keyof Database['public']['Tables'];

interface VersionConfig {
  tables: TableName[];
  maxVersions: number;
}

export class VersioningService {
  private static async createVersion(table: TableName, data: any[]): Promise<void> {
    const version = {
      table_name: table,
      data: data,
      created_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('versions')
      .insert(version);

    if (error) throw error;
  }

  private static async getLatestVersion(table: TableName): Promise<any[] | null> {
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

  private static async cleanupOldVersions(config: VersionConfig): Promise<void> {
    for (const table of config.tables) {
      const { data, error } = await supabase
        .from('versions')
        .select('id')
        .eq('table_name', table)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data.length > config.maxVersions) {
        const idsToDelete = data
          .slice(config.maxVersions)
          .map(version => version.id);

        const { error: deleteError } = await supabase
          .from('versions')
          .delete()
          .in('id', idsToDelete);

        if (deleteError) throw deleteError;
      }
    }
  }

  static async saveVersion(config: VersionConfig, table: TableName, data: any[]): Promise<void> {
    await this.createVersion(table, data);
    await this.cleanupOldVersions(config);
  }

  static async restoreVersion(table: TableName): Promise<void> {
    const data = await this.getLatestVersion(table);
    if (!data) throw new Error(`Keine Version für Tabelle ${table} gefunden`);

    const { error } = await supabase
      .from(table)
      .upsert(data);

    if (error) throw error;
  }
}

// Beispiel für die Verwendung:
export const versioningService = VersioningService.getInstance(); 