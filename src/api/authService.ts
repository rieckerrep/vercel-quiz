import { supabase } from '../supabaseClient';
import { apiCall, ApiResponse, showApiError, showApiSuccess } from './apiClient';
import { Database } from '../types/supabase';
import { ERROR_MESSAGES } from '../constants/errorMessages';
import { notificationService } from '../services/notificationService';

type User = Database['public']['Tables']['profiles']['Row'];
type University = Database['public']['Tables']['universities']['Row'];

/**
 * Authentifizierungsdienst für Benutzeranmeldung, -registrierung und -verwaltung
 */
export const authService = {
  /**
   * Benutzer anmelden
   */
  login: async (email: string, password: string): Promise<ApiResponse<{ user: any; profile: User | null }>> => {
    return apiCall(
      async () => {
        try {
          // Anmeldung mit Supabase
          const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (authError) {
            notificationService.error(ERROR_MESSAGES.AUTH.LOGIN_FAILED);
            console.error('Fehler bei der Anmeldung:', authError);
            return { data: null, error: authError };
          }

          if (!authData.user) {
            notificationService.error(ERROR_MESSAGES.AUTH.LOGIN_FAILED);
            return { data: null, error: new Error('Kein Benutzer gefunden') };
          }

          // Benutzerprofil abrufen
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authData.user.id)
            .single();

          if (profileError) {
            notificationService.error(ERROR_MESSAGES.USER.PROFILE_UPDATE);
            console.error('Fehler beim Abrufen des Profils:', profileError);
            // Wir geben trotzdem die Auth-Daten zurück, auch wenn das Profil nicht gefunden wurde
            return { data: { user: authData.user, profile: null }, error: null };
          }

          notificationService.success('Anmeldung erfolgreich!');
          return { data: { user: authData.user, profile: profileData }, error: null };
        } catch (error) {
          notificationService.error(ERROR_MESSAGES.GENERAL.UNKNOWN);
          console.error('Unerwarteter Fehler bei der Anmeldung:', error);
          return { data: null, error: error as Error };
        }
      },
      { requireAuth: false }
    );
  },

  /**
   * Benutzer registrieren
   */
  register: async (
    email: string,
    password: string,
    username: string,
    university: string
  ): Promise<ApiResponse<{ user: any; profile: User | null }>> => {
    return apiCall(
      async () => {
        try {
          // Prüfen, ob der Benutzername bereits existiert
          const { data: existingUser, error: checkError } = await supabase
            .from('profiles')
            .select('username')
            .eq('username', username);

          if (checkError) {
            notificationService.error(ERROR_MESSAGES.USER.PROFILE_UPDATE);
            console.error('Fehler bei der Benutzernamenprüfung:', checkError);
            return { data: null, error: checkError };
          }

          if (existingUser && existingUser.length > 0) {
            notificationService.error('Benutzername bereits vergeben');
            return { data: null, error: new Error('Benutzername bereits vergeben') };
          }

          // Benutzer registrieren
          const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
          });

          if (authError) {
            notificationService.error(ERROR_MESSAGES.GENERAL.UNKNOWN);
            console.error('Fehler bei der Registrierung:', authError);
            return { data: null, error: authError };
          }

          if (!authData.user) {
            notificationService.error(ERROR_MESSAGES.GENERAL.UNKNOWN);
            return { data: null, error: new Error('Registrierung fehlgeschlagen: Kein Benutzer erstellt') };
          }

          // Benutzerprofil erstellen
          const { data: profileData, error: profileError } = await supabase.from('profiles').insert([
            {
              id: authData.user.id,
              username,
              university,
              created_at: new Date().toISOString(),
            },
          ]);

          if (profileError) {
            notificationService.error(ERROR_MESSAGES.USER.PROFILE_UPDATE);
            console.error('Fehler beim Erstellen des Profils:', profileError);
            // Wir geben trotzdem die Auth-Daten zurück
            return { data: { user: authData.user, profile: null }, error: null };
          }

          // Benutzerstatistiken erstellen
          const { error: statsError } = await supabase.from('user_stats').insert([
            {
              user_id: authData.user.id,
              username,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              total_xp: 0,
              total_coins: 0,
              level: 1,
              questions_answered: 0,
              correct_answers: 0,
              streak: 0,
            },
          ]);

          if (statsError) {
            notificationService.error(ERROR_MESSAGES.USER.STATS_UPDATE);
            console.error('Fehler beim Erstellen der Benutzerstatistiken:', statsError);
          }

          notificationService.success('Registrierung erfolgreich!');
          return { data: { user: authData.user, profile: profileData?.[0] || null }, error: null };
        } catch (error) {
          notificationService.error(ERROR_MESSAGES.GENERAL.UNKNOWN);
          console.error('Unerwarteter Fehler bei der Registrierung:', error);
          return { data: null, error: error as Error };
        }
      },
      { requireAuth: false }
    );
  },

  /**
   * Benutzer abmelden
   */
  logout: async (): Promise<ApiResponse<void>> => {
    return apiCall(async () => {
      try {
        const { error } = await supabase.auth.signOut();
        
        if (error) {
          notificationService.error(ERROR_MESSAGES.AUTH.LOGOUT_FAILED);
          console.error('Fehler beim Abmelden:', error);
        } else {
          notificationService.success('Abmeldung erfolgreich!');
        }
        
        return { data: null, error };
      } catch (error) {
        notificationService.error(ERROR_MESSAGES.GENERAL.UNKNOWN);
        console.error('Unerwarteter Fehler beim Abmelden:', error);
        return { data: null, error: error as Error };
      }
    });
  },

  /**
   * Aktuelle Sitzung abrufen
   */
  getSession: async (): Promise<ApiResponse<{ user: any; profile: User | null }>> => {
    return apiCall(
      async () => {
        try {
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();

          if (sessionError) {
            notificationService.error(ERROR_MESSAGES.USER.SESSION_EXPIRED);
            console.error('Fehler beim Abrufen der Sitzung:', sessionError);
            return { data: null, error: sessionError };
          }

          if (!session) {
            notificationService.info(ERROR_MESSAGES.USER.NOT_LOGGED_IN);
            return { data: null, error: new Error('Keine aktive Sitzung') };
          }

          // Benutzerprofil abrufen
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (profileError) {
            notificationService.error(ERROR_MESSAGES.USER.PROFILE_UPDATE);
            console.error('Fehler beim Abrufen des Profils:', profileError);
            return { data: { user: session.user, profile: null }, error: null };
          }

          return { data: { user: session.user, profile: profileData }, error: null };
        } catch (error) {
          notificationService.error(ERROR_MESSAGES.GENERAL.UNKNOWN);
          console.error('Unerwarteter Fehler beim Abrufen der Sitzung:', error);
          return { data: null, error: error as Error };
        }
      },
      { requireAuth: false }
    );
  },

  /**
   * Benutzer mit OAuth-Anbieter anmelden
   */
  socialLogin: async (provider: "google" | "facebook"): Promise<ApiResponse<{ user: any; profile: User | null }>> => {
    return apiCall(async () => {
      try {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo: window.location.origin
          }
        });

        if (error) {
          notificationService.error(ERROR_MESSAGES.AUTH.SOCIAL_LOGIN_FAILED);
          console.error(`Fehler bei der ${provider}-Anmeldung:`, error);
          return { data: null, error };
        }

        // Bei OAuth wird der Benutzer zur Anmeldeseite des Providers weitergeleitet
        // Die Rückgabe enthält keine Benutzerdaten, aber wir geben ein leeres Objekt zurück, um den Typ zu erfüllen
        notificationService.info(`Weiterleitung zur ${provider}-Anmeldung...`);
        return { data: { user: {}, profile: null }, error: null };
      } catch (error) {
        notificationService.error(ERROR_MESSAGES.GENERAL.UNKNOWN);
        console.error(`Unerwarteter Fehler bei der ${provider}-Anmeldung:`, error);
        return { data: null, error: error as Error };
      }
    });
  },

  /**
   * Passwort zurücksetzen
   */
  resetPassword: async (email: string): Promise<ApiResponse<void>> => {
    return apiCall(
      async () => {
        try {
          const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
          });
          
          if (error) {
            notificationService.error(ERROR_MESSAGES.AUTH.PASSWORD_RESET_FAILED);
            console.error('Fehler beim Zurücksetzen des Passworts:', error);
          } else {
            notificationService.success('E-Mail zum Zurücksetzen des Passworts wurde gesendet!');
          }
          
          return { data: null, error };
        } catch (error) {
          notificationService.error(ERROR_MESSAGES.GENERAL.UNKNOWN);
          console.error('Unerwarteter Fehler beim Zurücksetzen des Passworts:', error);
          return { data: null, error: error as Error };
        }
      },
      { requireAuth: false }
    );
  },

  /**
   * Passwort ändern
   */
  changePassword: async (newPassword: string): Promise<ApiResponse<void>> => {
    return apiCall(async () => {
      try {
        const { error } = await supabase.auth.updateUser({
          password: newPassword,
        });
        
        if (error) {
          notificationService.error(ERROR_MESSAGES.AUTH.PASSWORD_CHANGE_FAILED);
          console.error('Fehler beim Ändern des Passworts:', error);
        } else {
          notificationService.success('Passwort wurde erfolgreich geändert!');
        }
        
        return { data: null, error };
      } catch (error) {
        notificationService.error(ERROR_MESSAGES.GENERAL.UNKNOWN);
        console.error('Unerwarteter Fehler beim Ändern des Passworts:', error);
        return { data: null, error: error as Error };
      }
    });
  },

  /**
   * Universitäten abrufen
   */
  fetchUniversities: async (): Promise<ApiResponse<University[]>> => {
    return apiCall(async () => {
      const { data, error } = await supabase
        .from('universities')
        .select('*')
        .order('name');
      
      return { data, error };
    });
  }
};

export default authService; 