import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import { Database } from '../lib/supabase';
import { PostgrestFilterBuilder } from '@supabase/postgrest-js';

// Definiere einen Typ für alle verfügbaren Tabellennamen
export type TableName = keyof Database['public']['Tables'];

// Definiere Typen für die Tabellendaten
type TableRow<T extends TableName> = Database['public']['Tables'][T]['Row'];
type TableInsert<T extends TableName> = Database['public']['Tables'][T]['Insert'];
type TableUpdate<T extends TableName> = Database['public']['Tables'][T]['Update'];

// Definiere den Typ für die Filterbuilder-Rückgabe
type FilterBuilder<T extends TableName> = PostgrestFilterBuilder<
  Database['public'],
  TableRow<T>,
  TableRow<T>[],
  any
>;

/**
 * Hook zum Zugriff auf eine Supabase-Tabelle
 * @param tableName Name der Tabelle in der Supabase-Datenbank
 * @param options Optionen für die Datenabfrage
 */
export function useSupabaseTable<T extends TableName>(
  tableName: T,
  options?: {
    where?: { column: keyof TableRow<T>; value: any }[];
    orderBy?: { column: keyof TableRow<T>; ascending?: boolean };
    limit?: number;
    queryKey?: any[];
    single?: boolean;
    columns?: string;
  }
) {
  console.log("[useSupabaseTable] Called with table:", tableName, "options:", options);
  
  const queryClient = useQueryClient();
  const defaultQueryKey = [tableName, ...(options?.where || []).map(w => w.value)];
  const queryKey = options?.queryKey || defaultQueryKey;

  // Fetch-Funktion
  const getTableData = async () => {
    console.log(`[useSupabaseTable] Executing query for: ${tableName}`);
    
    let query = supabase.from(tableName).select(options?.columns || '*') as FilterBuilder<T>;

    // Filterkriterien anwenden
    if (options?.where && options.where.length > 0) {
      console.log("[useSupabaseTable] Applying filters:", options.where);
      options.where.forEach(filter => {
        query = query.eq(String(filter.column), filter.value) as FilterBuilder<T>;
      });
    }

    // Sortierkriterien anwenden
    if (options?.orderBy) {
      console.log("[useSupabaseTable] Applying orderBy:", options.orderBy);
      query = query.order(String(options.orderBy.column), { 
        ascending: options.orderBy.ascending ?? true 
      }) as FilterBuilder<T>;
    }

    // Limit anwenden
    if (options?.limit) {
      console.log("[useSupabaseTable] Applying limit:", options.limit);
      query = query.limit(options.limit);
    }

    // Einzelnes Element oder Liste
    try {
      let result;
      
      if (options?.single) {
        console.log("[useSupabaseTable] Executing as maybeSingle()");
        const { data, error } = await query.maybeSingle();
        result = { data, error };
      } else {
        console.log("[useSupabaseTable] Executing as standard query");
        result = await query;
      }
      
      console.log("[useSupabaseTable] Query result:", result);
      
      if (result.error) {
        console.error("[useSupabaseTable] Error in query:", result.error);
        throw new Error(result.error.message);
      }
      
      return (result.data || []) as unknown as TableRow<T>[];
    } catch (e) {
      console.error("[useSupabaseTable] Exception in query:", e);
      throw e;
    }
  };

  // Daten abrufen mit useQuery
  const query = useQuery<TableRow<T>[]>({
    queryKey,
    queryFn: getTableData,
    staleTime: 60 * 1000, // 1 Minute cache
  });

  // Insert Mutation
  const insertMutation = useMutation({
    mutationFn: async (newItem: TableInsert<T>) => {
      const { data, error } = await supabase
        .from(tableName)
        .insert(newItem as any)
        .select();

      if (error) throw new Error(error.message);
      return (data?.[0] || null) as unknown as TableRow<T>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  // Update Mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: TableUpdate<T> }) => {
      const { data, error } = await supabase
        .from(tableName)
        .update(updates as any)
        .eq('id' as any, id)
        .select();

      if (error) throw new Error(error.message);
      return (data?.[0] || null) as unknown as TableRow<T>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id' as any, id);

      if (error) throw new Error(error.message);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    ...query,
    insert: insertMutation.mutate,
    insertAsync: insertMutation.mutateAsync,
    update: updateMutation.mutate,
    updateAsync: updateMutation.mutateAsync,
    remove: deleteMutation.mutate,
    removeAsync: deleteMutation.mutateAsync,
    isInserting: insertMutation.isPending,
    isUpdating: updateMutation.isPending,
    isRemoving: deleteMutation.isPending,
    // Helper-Funktion für benutzerdefinierte Abfragen
    runCustomQuery: async (
      customQueryFn: (query: ReturnType<typeof supabase.from>) => Promise<any>
    ) => {
      const result = await customQueryFn(supabase.from(tableName));
      queryClient.invalidateQueries({ queryKey });
      return result;
    },
  };
}

export default useSupabaseTable; 