import { supabase } from '../lib/supabaseClient';
import { toast } from 'react-hot-toast';

// Typen für API-Antworten
export type ApiResponse<T> = {
  success: boolean;
  error: Error | null;
  data: T | null;
};

// Typen für API-Fehler
export interface ApiError extends Error {
  status?: number;
  code?: string;
}

// Maximale Anzahl von Wiederholungsversuchen bei Rate-Limit-Fehlern
const MAX_RETRIES = 2;
const RETRY_DELAY = 3000; // 3 Sekunden

/**
 * Zentrale Funktion zur Fehlerbehandlung
 */
export const handleApiError = (error: any): ApiError => {
  console.error('API-Fehler:', error);
  
  // Supabase-Fehler in standardisierte API-Fehler umwandeln
  const apiError: ApiError = new Error(error.message || 'Ein unbekannter Fehler ist aufgetreten');
  
  // Status-Code extrahieren (falls vorhanden)
  if (error.status) {
    apiError.status = error.status;
  }
  
  // Fehlercode extrahieren (falls vorhanden)
  if (error.code) {
    apiError.code = error.code;
  }
  
  return apiError;
};

/**
 * Wrapper für API-Aufrufe mit automatischer Fehlerbehandlung und Token-Handling
 */
export const apiCall = async <T>(
  operation: () => Promise<{ data: T | null; error: Error | null }>,
  options: { requireAuth?: boolean } = { requireAuth: true }
): Promise<ApiResponse<T>> => {
  try {
    // Nur Authentifizierung prüfen, wenn erforderlich
    if (options.requireAuth) {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return {
          success: false,
          error: new Error('Nicht authentifiziert. Bitte melde dich an.'),
          data: null
        };
      }
    }

    const response = await operation();
    
    if (response.error) {
      return {
        success: false,
        error: response.error,
        data: null
      };
    }

    return {
      success: true,
      error: null,
      data: response.data
    };
  } catch (error) {
    console.error('API-Fehler:', error);
    return {
      success: false,
      error: error instanceof Error ? error : new Error('Ein unbekannter Fehler ist aufgetreten'),
      data: null
    };
  }
};

/**
 * Zeigt eine Fehlermeldung an, basierend auf dem Fehlertyp
 */
export const showApiError = (error: ApiError): void => {
  if (error.status === 401) {
    toast.error('Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.');
    // Hier könnte ein Redirect zur Login-Seite erfolgen
  } else if (error.status === 429) {
    toast.error('Zu viele Anfragen. Bitte warte kurz...');
  } else {
    toast.error(error.message || 'Ein Fehler ist aufgetreten');
  }
};

/**
 * Zeigt eine Erfolgsmeldung an
 */
export const showApiSuccess = (message: string): void => {
  toast.success(message);
};

export default {
  apiCall,
  handleApiError,
  showApiError,
  showApiSuccess
}; 