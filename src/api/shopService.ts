import { supabase } from '../supabaseClient';
import { apiCall, ApiResponse } from './apiClient';
import { Database } from '../types/supabase';

type ShopAvatar = Database['public']['Tables']['shop_avatars']['Row'];
type UserAvatar = Database['public']['Tables']['user_avatars']['Row'];
type UserStats = Database['public']['Tables']['user_stats']['Row'];

/**
 * Shop-Dienst für Avatare, Medaillen und Käufe
 */
export const shopService = {
  /**
   * Verfügbare Avatare abrufen
   */
  fetchAvatars: async (): Promise<ApiResponse<ShopAvatar[]>> => {
    return apiCall(async () => {
      const { data, error } = await supabase
        .from('shop_avatars')
        .select('*')
        .order('price');

      return { data, error };
    });
  },

  /**
   * Avatare eines Benutzers abrufen
   */
  fetchUserAvatars: async (userId: string): Promise<ApiResponse<UserAvatar[]>> => {
    return apiCall(async () => {
      const { data, error } = await supabase
        .from('user_avatars')
        .select('*')
        .eq('user_id', userId);

      return { data, error };
    });
  },

  /**
   * Avatar kaufen
   */
  buyAvatar: async (userId: string, avatarId: number): Promise<ApiResponse<{ success: boolean; userStats: UserStats | null }>> => {
    return apiCall<{ success: boolean; userStats: UserStats | null }>(async () => {
      // Avatar-Preis abrufen
      const { data: avatarData, error: avatarError } = await supabase
        .from('shop_avatars')
        .select('price')
        .eq('id', avatarId)
        .single();

      if (avatarError) {
        return { data: null, error: avatarError };
      }

      if (!avatarData) {
        return { data: null, error: new Error('Avatar nicht gefunden') };
      }

      const price = avatarData.price;

      // Benutzerstatistiken abrufen
      const { data: userStatsData, error: userStatsError } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (userStatsError) {
        return { data: null, error: userStatsError };
      }

      if (!userStatsData) {
        return { data: null, error: new Error('Benutzerstatistiken nicht gefunden') };
      }

      // Prüfen, ob der Benutzer genügend Münzen hat
      if ((userStatsData.total_coins || 0) < price) {
        return { 
          data: { 
            success: false, 
            userStats: userStatsData 
          }, 
          error: null 
        };
      }

      // Prüfen, ob der Benutzer den Avatar bereits besitzt
      const { data: existingAvatar, error: existingError } = await supabase
        .from('user_avatars')
        .select('*')
        .eq('user_id', userId)
        .eq('avatar_id', avatarId);

      if (existingError) {
        return { data: null, error: existingError };
      }

      if (existingAvatar && existingAvatar.length > 0) {
        return { 
          data: { 
            success: false, 
            userStats: userStatsData 
          }, 
          error: null 
        };
      }

      // Avatar kaufen
      const { error: buyError } = await supabase.from('user_avatars').insert([
        {
          user_id: userId,
          avatar_id: avatarId,
          created_at: new Date().toISOString(),
        },
      ]);

      if (buyError) {
        return { data: null, error: buyError };
      }

      // Münzen abziehen
      const { data: updatedStats, error: updateError } = await supabase
        .from('user_stats')
        .update({
          total_coins: (userStatsData.total_coins || 0) - price,
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (updateError) {
        return { data: null, error: updateError };
      }

      return { 
        data: { 
          success: true, 
          userStats: updatedStats 
        }, 
        error: null 
      };
    });
  },

  /**
   * Avatar aktivieren
   */
  activateAvatar: async (userId: string, avatarId: number): Promise<ApiResponse<{ success: boolean; userStats: UserStats | null }>> => {
    return apiCall<{ success: boolean; userStats: UserStats | null }>(async () => {
      // Prüfen, ob der Benutzer den Avatar besitzt
      const { data: existingAvatar, error: existingError } = await supabase
        .from('user_avatars')
        .select('*')
        .eq('user_id', userId)
        .eq('avatar_id', avatarId);

      if (existingError) {
        return { data: null, error: existingError };
      }

      if (!existingAvatar || existingAvatar.length === 0) {
        return { 
          data: { 
            success: false, 
            userStats: null 
          }, 
          error: null 
        };
      }

      // Avatar-URL abrufen
      const { data: avatarData, error: avatarError } = await supabase
        .from('shop_avatars')
        .select('image_url')
        .eq('id', avatarId)
        .single();

      if (avatarError) {
        return { data: null, error: avatarError };
      }

      if (!avatarData) {
        return { data: null, error: new Error('Avatar nicht gefunden') };
      }

      // Avatar aktivieren
      const { data: updatedStats, error: updateError } = await supabase
        .from('user_stats')
        .update({
          avatar_url: avatarData.image_url,
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (updateError) {
        return { data: null, error: updateError };
      }

      return { 
        data: { 
          success: true, 
          userStats: updatedStats 
        }, 
        error: null 
      };
    });
  },

  /**
   * Medaille hinzufügen
   */
  addMedal: async (userId: string, medalType: 'gold' | 'silver' | 'bronze'): Promise<ApiResponse<UserStats>> => {
    return apiCall(async () => {
      // Benutzerstatistiken abrufen
      const { data: userStatsData, error: userStatsError } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (userStatsError) {
        return { data: null, error: userStatsError };
      }

      if (!userStatsData) {
        return { data: null, error: new Error('Benutzerstatistiken nicht gefunden') };
      }

      // Medaille hinzufügen
      const updateData: any = {};
      if (medalType === 'gold') {
        updateData.gold_medals = (userStatsData.gold_medals || 0) + 1;
      } else if (medalType === 'silver') {
        updateData.silver_medals = (userStatsData.silver_medals || 0) + 1;
      } else if (medalType === 'bronze') {
        updateData.bronze_medals = (userStatsData.bronze_medals || 0) + 1;
      }

      // Statistiken aktualisieren
      const { data, error } = await supabase
        .from('user_stats')
        .update(updateData)
        .eq('user_id', userId)
        .select()
        .single();

      return { data, error };
    });
  },
};

export default shopService; 