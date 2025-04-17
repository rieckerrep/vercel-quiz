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
      
      // Initial auth check mit verbesserter Fehlerbehandlung
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Session error:', sessionError);
        // Versuche die Session zu aktualisieren
        const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError) {
          console.error('Refresh error:', refreshError);
          set({ error: refreshError.message, isLoading: false });
          return;
        }
        
        if (!refreshedSession) {
          set({ user: null, isLoading: false });
          return;
        }
        
        set({ user: refreshedSession.user, isLoading: false });
      } else if (session) {
        set({ user: session.user, isLoading: false });
      } else {
        set({ user: null, isLoading: false });
      }

      // Auth state listener mit verbesserter Fehlerbehandlung
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('Auth state changed:', event, session?.user);
        
        if (event === 'SIGNED_OUT') {
          set({ user: null, isLoading: false });
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          if (session?.user) {
            set({ user: session.user, isLoading: false });
          }
        } else if (event === 'USER_UPDATED') {
          if (session?.user) {
            set({ user: session.user, isLoading: false });
          }
        }
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