import { describe, it, expect, vi, beforeEach } from 'vitest';
import shopService from '../../api/shopService';
import { supabase } from '../../lib/supabaseClient';
import type { PostgrestSingleResponse, PostgrestError } from '@supabase/supabase-js';
import type { Database } from '../../lib/supabase';

// Typen für die Mock-Objekte
type ShopAvatar = Database['public']['Tables']['shop_avatars']['Row'];
type UserAvatar = Database['public']['Tables']['user_avatars']['Row'];
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

describe('shopService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchAvatars', () => {
    it('sollte verfügbare Avatare erfolgreich abrufen', async () => {
      const mockAvatars: ShopAvatar[] = [
        {
          id: 1,
          title: 'Test Avatar 1',
          image_url: 'https://example.com/avatar1.png',
          price: 100,
          category: 'basic',
          active: true,
        },
        {
          id: 2,
          title: 'Test Avatar 2',
          image_url: 'https://example.com/avatar2.png',
          price: 200,
          category: 'premium',
          active: true,
        },
      ];

      const mockQuery = createMockQuery();
      mockQuery.select.mockReturnValue(mockQuery);
      mockQuery.order.mockResolvedValueOnce({ data: mockAvatars, error: null });
      vi.mocked(supabase.from).mockReturnValue(mockQuery as unknown as ReturnType<typeof supabase.from>);

      const result = await shopService.fetchAvatars();

      expect(result.data).toEqual(mockAvatars);
      expect(result.error).toBeNull();
      expect(supabase.from).toHaveBeenCalledWith('shop_avatars');
    });
  });

  describe('fetchUserAvatars', () => {
    it('sollte Benutzeravatare erfolgreich abrufen', async () => {
      const mockUserAvatars: UserAvatar[] = [
        {
          user_id: 'test-user-id',
          avatar_id: 1,
          created_at: '2024-01-01',
        },
        {
          user_id: 'test-user-id',
          avatar_id: 2,
          created_at: '2024-01-01',
        },
      ];

      const mockQuery = createMockQuery();
      mockQuery.select.mockReturnValue(mockQuery);
      mockQuery.eq.mockResolvedValueOnce({ data: mockUserAvatars, error: null });
      vi.mocked(supabase.from).mockReturnValue(mockQuery as unknown as ReturnType<typeof supabase.from>);

      const result = await shopService.fetchUserAvatars('test-user-id');

      expect(result.data).toEqual(mockUserAvatars);
      expect(result.error).toBeNull();
      expect(supabase.from).toHaveBeenCalledWith('user_avatars');
    });
  });

  describe('buyAvatar', () => {
    it('sollte einen Avatar erfolgreich kaufen', async () => {
      const mockAvatar: ShopAvatar = {
        id: 1,
        title: 'Test Avatar',
        image_url: 'https://example.com/avatar.png',
        price: 100,
        category: 'basic',
        active: true,
      };

      const mockUserStats: UserStats = {
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
      mockQuery.single.mockResolvedValueOnce(createPostgrestResponse(mockAvatar, null));
      mockQuery.single.mockResolvedValueOnce(createPostgrestResponse(mockUserStats, null));
      mockQuery.insert.mockResolvedValueOnce({ data: null, error: null });
      mockQuery.single.mockResolvedValueOnce(createPostgrestResponse({
        ...mockUserStats,
        total_coins: 400,
      }, null));
      vi.mocked(supabase.from).mockReturnValue(mockQuery as unknown as ReturnType<typeof supabase.from>);

      const result = await shopService.buyAvatar('test-user-id', 1);

      expect(result.data?.success).toBe(true);
      expect(result.data?.userStats?.total_coins).toBe(400);
      expect(result.error).toBeNull();
    });

    it('sollte einen Fehler zurückgeben, wenn nicht genügend Münzen vorhanden sind', async () => {
      const mockAvatar: ShopAvatar = {
        id: 1,
        title: 'Test Avatar',
        image_url: 'https://example.com/avatar.png',
        price: 1000,
        category: 'premium',
        active: true,
      };

      const mockUserStats: UserStats = {
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
      mockQuery.single.mockResolvedValueOnce(createPostgrestResponse(mockAvatar, null));
      mockQuery.single.mockResolvedValueOnce(createPostgrestResponse(mockUserStats, null));
      vi.mocked(supabase.from).mockReturnValue(mockQuery as unknown as ReturnType<typeof supabase.from>);

      const result = await shopService.buyAvatar('test-user-id', 1);

      expect(result.data?.success).toBe(false);
      expect(result.data?.userStats).toEqual(mockUserStats);
      expect(result.error).toBeNull();
    });
  });

  describe('activateAvatar', () => {
    it('sollte einen Avatar erfolgreich aktivieren', async () => {
      const mockUserAvatar: UserAvatar = {
        user_id: 'test-user-id',
        avatar_id: 1,
        created_at: '2024-01-01',
      };

      const mockAvatar: ShopAvatar = {
        id: 1,
        title: 'Test Avatar',
        image_url: 'https://example.com/avatar.png',
        price: 100,
        category: 'basic',
        active: true,
      };

      const mockUserStats: UserStats = {
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

      // Erstelle separate Mock-Query-Objekte für jeden Aufruf
      const mockQuery1 = createMockQuery();
      const mockQuery2 = createMockQuery();
      const mockQuery3 = createMockQuery();
      
      // Konfiguriere die Mocks für die verschiedenen Aufrufe
      mockQuery1.select.mockReturnValue(mockQuery1);
      mockQuery1.eq.mockReturnValue(mockQuery1);
      mockQuery1.eq.mockResolvedValueOnce({ data: [mockUserAvatar], error: null });
      
      mockQuery2.select.mockReturnValue(mockQuery2);
      mockQuery2.eq.mockReturnValue(mockQuery2);
      mockQuery2.single.mockResolvedValueOnce(createPostgrestResponse(mockAvatar, null));
      
      mockQuery3.select.mockReturnValue(mockQuery3);
      mockQuery3.eq.mockReturnValue(mockQuery3);
      mockQuery3.single.mockResolvedValueOnce(createPostgrestResponse({
        ...mockUserStats,
        avatar_url: mockAvatar.image_url,
      }, null));
      
      // Konfiguriere die Supabase-Mocks
      let callCount = 0;
      vi.mocked(supabase.from).mockImplementation(() => {
        callCount++;
        if (callCount === 1) return mockQuery1 as unknown as ReturnType<typeof supabase.from>;
        if (callCount === 2) return mockQuery2 as unknown as ReturnType<typeof supabase.from>;
        if (callCount === 3) return mockQuery3 as unknown as ReturnType<typeof supabase.from>;
        return mockQuery1 as unknown as ReturnType<typeof supabase.from>;
      });

      const result = await shopService.activateAvatar('test-user-id', 1);

      expect(result.data).toEqual({
        success: true,
        userStats: {
          ...mockUserStats,
          avatar_url: mockAvatar.image_url,
        }
      });
      expect(result.error).toBeNull();
    });

    it('sollte einen Fehler zurückgeben, wenn der Avatar nicht gekauft wurde', async () => {
      // Erstelle separate Mock-Query-Objekte für jeden Aufruf
      const mockQuery1 = createMockQuery();
      
      // Konfiguriere die Mocks für die verschiedenen Aufrufe
      mockQuery1.select.mockReturnValue(mockQuery1);
      mockQuery1.eq.mockReturnValue(mockQuery1);
      mockQuery1.eq.mockResolvedValueOnce({ data: [], error: null });
      
      // Konfiguriere die Supabase-Mocks
      vi.mocked(supabase.from).mockImplementation(() => mockQuery1 as unknown as ReturnType<typeof supabase.from>);

      const result = await shopService.activateAvatar('test-user-id', 1);

      expect(result.data).toEqual({
        success: false,
        userStats: null
      });
      expect(result.error).toBeNull();
    });
  });

  describe('addMedal', () => {
    it('sollte eine Goldmedaille erfolgreich hinzufügen', async () => {
      const mockUserStats: UserStats = {
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
      mockQuery.single.mockResolvedValueOnce(createPostgrestResponse(mockUserStats, null));
      mockQuery.single.mockResolvedValueOnce(createPostgrestResponse({
        ...mockUserStats,
        gold_medals: 6,
      }, null));
      vi.mocked(supabase.from).mockReturnValue(mockQuery as unknown as ReturnType<typeof supabase.from>);

      const result = await shopService.addMedal('test-user-id', 'gold');

      expect(result.data?.gold_medals).toBe(6);
      expect(result.error).toBeNull();
    });
  });
}); 