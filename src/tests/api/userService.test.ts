import { describe, it, expect, vi, beforeEach } from 'vitest';
import userService from '../../api/userService';
import { supabase } from '../../lib/supabaseClient';
import type { PostgrestSingleResponse, PostgrestError } from '@supabase/supabase-js';
import type { Database } from '../../lib/supabase';

// Typen für die Mock-Objekte
type Profile = Database['public']['Tables']['profiles']['Row'];
type UserStats = Database['public']['Tables']['user_stats']['Row'];

// Mock für react-hot-toast
vi.mock('react-hot-toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock für Supabase
vi.mock('../../supabaseClient', () => ({
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

// Hilfsfunktion für PostgrestSingleResponse
const createPostgrestResponse = <T extends object>(data: T | null, error: PostgrestError | null): PostgrestSingleResponse<T> => {
  return {
    data,
    error,
    count: data ? 1 : 0,
    status: error ? 400 : 200,
    statusText: error ? 'ERROR' : 'OK',
  } as PostgrestSingleResponse<T>;
};

// Hilfsfunktion für PostgrestError
const createPostgrestError = (message: string): PostgrestError => {
  return {
    message,
    details: '',
    hint: '',
    code: 'PGRST116',
    name: 'PostgrestError',
  };
};

// Hilfsfunktion für Mock-Query
const createMockQuery = () => {
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
  };
  return mockQuery;
};

describe('userService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchProfile', () => {
    it('sollte ein Benutzerprofil erfolgreich abrufen', async () => {
      const mockProfile: Profile = {
        id: 'test-user-id',
        username: 'testuser',
        avatar_url: null,
        university: 'Test University',
        created_at: '2024-01-01',
      };

      const mockQuery = createMockQuery();
      mockQuery.single.mockResolvedValue(createPostgrestResponse(mockProfile, null));
      vi.mocked(supabase.from).mockReturnValue(mockQuery as unknown as ReturnType<typeof supabase.from>);

      const result = await userService.fetchProfile('test-user-id');

      expect(result.data).toEqual(mockProfile);
      expect(result.error).toBeNull();
      expect(supabase.from).toHaveBeenCalledWith('profiles');
    });

    it('sollte einen Fehler zurückgeben, wenn das Profil nicht gefunden wird', async () => {
      const mockError = createPostgrestError('Profil nicht gefunden');
      const mockQuery = createMockQuery();
      mockQuery.single.mockResolvedValue(createPostgrestResponse(null, mockError));
      vi.mocked(supabase.from).mockReturnValue(mockQuery as unknown as ReturnType<typeof supabase.from>);

      const result = await userService.fetchProfile('non-existent-id');

      expect(result.data).toBeNull();
      expect(result.error).toBeDefined();
      expect(result.error?.message).toBe('Profil nicht gefunden');
    });
  });

  describe('fetchStats', () => {
    it('sollte Benutzerstatistiken erfolgreich abrufen', async () => {
      const mockStats: UserStats = {
        id: 'test-user-id',
        user_id: 'test-user-id',
        username: 'testuser',
        avatar_url: null,
        total_xp: 1000,
        total_coins: 500,
        questions_answered: 50,
        correct_answers: 40,
        current_league: 'Gold',
        gold_medals: 5,
        silver_medals: 3,
        bronze_medals: 2,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
        last_played: '2024-01-01',
        league_group: 'A',
        level: 5,
        streak: 3,
        title: 'Anfänger'
      };

      const mockQuery = createMockQuery();
      mockQuery.single.mockResolvedValue(createPostgrestResponse(mockStats, null));
      vi.mocked(supabase.from).mockReturnValue(mockQuery as unknown as ReturnType<typeof supabase.from>);

      const result = await userService.fetchStats('test-user-id');

      expect(result.data).toEqual(mockStats);
      expect(result.error).toBeNull();
      expect(supabase.from).toHaveBeenCalledWith('user_stats');
    });
  });
}); 