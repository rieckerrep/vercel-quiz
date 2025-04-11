import { Database } from './supabase';

export interface Avatar {
  id: number;
  name: string;
  price: number;
  image_url: string;
  active?: boolean;
  category?: string;
}

export interface UserAvatar {
  id: number;
  user_id: string;
  avatar_id: number;
  active: boolean;
  purchased_at: string;
}

export interface Joker {
  id: number;
  type: 'fiftyFifty' | 'timeBonus' | 'skipQuestion';
  price: number;
  description: string;
}

export interface Transaction {
  id: number;
  user_id: string;
  type: 'avatar_purchase' | 'joker_purchase';
  item_id: number;
  price: number;
  created_at: string;
}

export interface ShopState {
  avatars: Avatar[];
  userAvatars: UserAvatar[];
  selectedAvatar: Avatar | null;
  availableJokers: Joker[];
  userJokers: Record<string, number>;
  transactions: Transaction[];
  setAvatars: (avatars: Avatar[]) => void;
  setUserAvatars: (userAvatars: UserAvatar[]) => void;
  setSelectedAvatar: (avatar: Avatar | null) => void;
  buyAvatar: (userId: string, avatarId: number) => Promise<{ data: UserAvatar | null; error: Error | null }>;
  activateAvatar: (userId: string, avatarId: number) => Promise<{ data: UserAvatar | null; error: Error | null }>;
  buyJoker: (userId: string, jokerType: string) => Promise<{ data: { success: boolean; userStats: Database['public']['Tables']['user_stats']['Row'] } | null; error: Error | null }>;
  processTransaction: (transaction: Omit<Transaction, 'id' | 'created_at'>) => Promise<{ data: Transaction | null; error: Error | null }>;
  getTransactionHistory: (userId: string) => Promise<{ data: Transaction[] | null; error: Error | null }>;
  getAvailableJokers: () => Promise<{ data: Joker[] | null; error: Error | null }>;
  getJokerPrices: () => Promise<{ data: Record<string, number> | null; error: Error | null }>;
} 