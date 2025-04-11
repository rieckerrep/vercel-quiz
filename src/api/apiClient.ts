import { supabase } from '../lib/supabaseClient';
import { toast } from 'react-hot-toast';

// Typen für API-Antworten
export interface ApiResponse<T> {
  data: T | null;
  error: Error | null;
}

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
  apiFunction: () => Promise<{ data: T | null; error: any }>,
  options: {
    requireAuth?: boolean;
    retryOnRateLimit?: boolean;
  } = {}
): Promise<ApiResponse<T>> => {
  const { requireAuth = true, retryOnRateLimit = true } = options;
  
  // Prüfen, ob ein Benutzer angemeldet ist
  if (requireAuth) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return {
        data: null,
        error: new Error('Nicht authentifiziert. Bitte melde dich an.') as ApiError
      };
    }
  }
  
  let retries = 0;
  
  while (true) {
    try {
      const response = await apiFunction();
      
      if (response.error) {
        // Rate-Limit-Fehler behandeln
        if (response.error.code === '429' && retryOnRateLimit && retries < MAX_RETRIES) {
          retries++;
          console.log(`Rate-Limit erreicht. Warte ${RETRY_DELAY}ms vor Wiederholung (${retries}/${MAX_RETRIES})...`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
          continue;
        }
        
        // Fehler zurückgeben
        return {
          data: null,
          error: handleApiError(response.error)
        };
      }
      
      // Erfolgreiche Antwort zurückgeben
      return {
        data: response.data,
        error: null
      };
    } catch (error) {
      // Unerwartete Fehler behandeln
      return {
        data: null,
        error: handleApiError(error)
      };
    }
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