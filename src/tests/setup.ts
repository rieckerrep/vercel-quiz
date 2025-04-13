import { vi, beforeEach } from 'vitest';
import type { PostgrestError, PostgrestSingleResponse } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

// Mock für Supabase
vi.mock('../supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: {
          session: {
            access_token: 'test-token',
            refresh_token: 'test-refresh-token',
            user: {
              id: 'test-user-id',
              email: 'test@example.com',
            },
          },
        },
        error: null,
      }),
    },
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

// Mock für NotificationService
vi.mock('../services/notificationService', () => ({
  notificationService: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
    warning: vi.fn()
  }
}));

// Imports nach den Mocks
import { notificationService } from '../services/notificationService';
import { supabase } from '../lib/supabaseClient';

// Mock-Daten
const mockSession = {
  access_token: 'test-access-token',
  refresh_token: 'test-refresh-token',
  expires_in: 3600,
  token_type: 'bearer',
  user: {
    id: 'test-user-id',
    email: 'test@example.com',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: new Date().toISOString()
  }
};

// Hilfsfunktion für PostgrestSingleResponse
export const createPostgrestResponse = <T extends object>(data: T | null, error: PostgrestError | null): PostgrestSingleResponse<T> => {
  return {
    data,
    error,
    count: data ? 1 : 0,
    status: error ? 400 : 200,
    statusText: error ? 'ERROR' : 'OK',
  } as PostgrestSingleResponse<T>;
};

// Hilfsfunktion für Mock-Query
export const createMockQuery = () => {
  const mockQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    url: new URL('http://localhost'),
    headers: {},
    insert: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    like: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    contains: vi.fn().mockReturnThis(),
    containedBy: vi.fn().mockReturnThis(),
    rangeGt: vi.fn().mockReturnThis(),
    rangeGte: vi.fn().mockReturnThis(),
    rangeLt: vi.fn().mockReturnThis(),
    rangeLte: vi.fn().mockReturnThis(),
    rangeAdjacent: vi.fn().mockReturnThis(),
    overlaps: vi.fn().mockReturnThis(),
    textSearch: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    filter: vi.fn().mockReturnThis(),
    match: vi.fn().mockReturnThis(),
  };
  return mockQuery as any;
};

// Globale Testumgebung vorbereiten
beforeEach(() => {
  // Alle Mocks zurücksetzen
  vi.clearAllMocks();
  
  // Supabase-Mock-Implementierungen zurücksetzen
  vi.mocked(supabase.from).mockImplementation(() => createMockQuery());
  vi.mocked(supabase.rpc).mockImplementation(() => createMockQuery());
  vi.mocked(supabase.auth.getSession).mockResolvedValue({
    data: { session: mockSession },
    error: null
  });
  
  // NotificationService-Mock-Implementierungen zurücksetzen
  vi.mocked(notificationService.error).mockReset();
  vi.mocked(notificationService.success).mockReset();
  vi.mocked(notificationService.info).mockReset();
  vi.mocked(notificationService.warning).mockReset();
}); 