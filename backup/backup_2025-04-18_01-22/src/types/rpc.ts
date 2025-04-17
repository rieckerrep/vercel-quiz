import type { Database } from './supabase';

export type RpcFunction = keyof Database['public']['Functions'];

export type RpcReturnType<T extends RpcFunction> = Database['public']['Functions'][T]['Returns'];

export type RpcArgs<T extends RpcFunction> = Database['public']['Functions'][T]['Args']; 