import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import { Database } from '../lib/supabase';

// Definiere einen Typ, der alle Tabellennamen als String akzeptiert
// Das ist nötig, da TypeScript strenge Typisierung für die Tabellennamen verlangt,
// wir aber dynamische Anfragen über verschiedene Tabellen machen wollen
export type AnyTable = keyof Database['public']['Tables'] | string;

/**
 * Hook zum Zugriff auf eine Supabase-Tabelle
 * @param tableName Name der Tabelle in der Supabase-Datenbank
 * @param options Optionen für die Datenabfrage
 */
export function useSupabaseTable(
  tableName: AnyTable,
  options?: {
    where?: { column: string; value: any }[];
    orderBy?: { column: string; ascending?: boolean };
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
    
    let query = supabase.from(tableName).select(options?.columns || '*');

    // Filterkriterien anwenden
    if (options?.where && options.where.length > 0) {
      console.log("[useSupabaseTable] Applying filters:", options.where);
      options.where.forEach(filter => {
        query = query.eq(filter.column, filter.value) as any;
      });
    }

    // Sortierkriterien anwenden
    if (options?.orderBy) {
      console.log("[useSupabaseTable] Applying orderBy:", options.orderBy);
      query = query.order(options.orderBy.column, { 
        ascending: options.orderBy.ascending ?? true 
      });
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
      
      return result.data;
    } catch (e) {
      console.error("[useSupabaseTable] Exception in query:", e);
      throw e;
    }
  };

  // Daten abrufen mit useQuery
  const query = useQuery({
    queryKey,
    queryFn: getTableData,
    staleTime: 60 * 1000, // 1 Minute cache
  });

  // Insert Mutation
  const insertMutation = useMutation({
    mutationFn: async (newItem: any) => {
      const { data, error } = await supabase
        .from(tableName)
        .insert(newItem)
        .select();

      if (error) throw new Error(error.message);
      return data?.[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  // Update Mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number | string; updates: any }) => {
      const { data, error } = await supabase
        .from(tableName)
        .update(updates)
        .eq('id', id)
        .select();

      if (error) throw new Error(error.message);
      return data?.[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number | string) => {
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id);

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