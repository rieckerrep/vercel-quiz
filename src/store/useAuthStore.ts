import { create } from 'zustand';
import { supabase } from '../lib/supabaseClient';

interface AuthState {
  user: any | null;
  isLoading: boolean;
  error: string | null;
  setUser: (user: any | null) => void;
  initAuth: () => Promise<(() => void) | void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  error: null,
  setUser: (user) => set({ user }),
  
  initAuth: async () => {
    try {
      set({ isLoading: true, error: null });
      
      // Initial auth check
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('Auth error:', userError);
        set({ error: userError.message, isLoading: false });
        return;
      }

      set({ user, isLoading: false });

      // Auth state listener
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        console.log('Auth state changed:', event, session?.user);
        set({ user: session?.user ?? null, isLoading: false });
      });

      return () => {
        subscription?.unsubscribe();
      };
    } catch (error) {
      console.error('Auth initialization error:', error);
      set({ error: 'Fehler bei der Authentifizierung', isLoading: false });
    }
  },

  signOut: async () => {
    try {
      set({ isLoading: true, error: null });
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Sign out error:', error);
        set({ error: error.message, isLoading: false });
        return;
      }
      
      set({ user: null, isLoading: false });
    } catch (error) {
      console.error('Sign out error:', error);
      set({ error: 'Fehler beim Abmelden', isLoading: false });
    }
  },
})); 