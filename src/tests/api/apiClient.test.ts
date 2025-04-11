import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiCall, handleApiError, showApiError, showApiSuccess } from '../../api/apiClient';
import { supabase } from '../../lib/supabaseClient';
import { toast } from 'react-hot-toast';

// Mock für toast
vi.mock('react-hot-toast', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn()
  }
}));

// Mock für supabase.auth.getSession
vi.mock('../../supabaseClient', () => {
  return {
    supabase: {
      auth: {
        getSession: vi.fn()
      }
    }
  };
});

// Typ für API-Fehler
interface ApiError {
  message?: string;
  status?: number;
  code?: string;
}

describe('apiClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Standard-Mock für getSession
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { 
        session: {
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
        }
      },
      error: null
    });
  });

  describe('apiCall', () => {
    it('sollte erfolgreich einen API-Aufruf durchführen', async () => {
      const mockApiFunction = vi.fn().mockResolvedValue({
        data: { test: 'data' },
        error: null
      });

      const result = await apiCall(mockApiFunction);

      expect(result.data).toEqual({ test: 'data' });
      expect(result.error).toBeNull();
      expect(mockApiFunction).toHaveBeenCalled();
    });

    it('sollte einen Fehler zurückgeben, wenn die API einen Fehler zurückgibt', async () => {
      const mockError = { message: 'Test error', status: 400, code: 'BAD_REQUEST' };
      const mockApiFunction = vi.fn().mockResolvedValue({
        data: null,
        error: mockError
      });

      const result = await apiCall(mockApiFunction);

      expect(result.data).toBeNull();
      expect(result.error).toBeDefined();
      expect(result.error?.message).toBe('Test error');
      expect(mockApiFunction).toHaveBeenCalled();
    });

    it('sollte einen Fehler zurückgeben, wenn kein Benutzer angemeldet ist und requireAuth true ist', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null
      });

      const mockApiFunction = vi.fn().mockResolvedValue({
        data: { test: 'data' },
        error: null
      });

      const result = await apiCall(mockApiFunction);

      expect(result.data).toBeNull();
      expect(result.error).toBeDefined();
      expect(result.error?.message).toBe('Nicht authentifiziert. Bitte melde dich an.');
      expect(mockApiFunction).not.toHaveBeenCalled();
    });

    it('sollte einen API-Aufruf durchführen, wenn requireAuth false ist, auch wenn kein Benutzer angemeldet ist', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null
      });

      const mockApiFunction = vi.fn().mockResolvedValue({
        data: { test: 'data' },
        error: null
      });

      const result = await apiCall(mockApiFunction, { requireAuth: false });

      expect(result.data).toEqual({ test: 'data' });
      expect(result.error).toBeNull();
      expect(mockApiFunction).toHaveBeenCalled();
    });

    it('sollte bei Rate-Limit-Fehlern wiederholen', async () => {
      const mockError = { message: 'Rate limit exceeded', status: 429, code: '429' };
      const mockApiFunction = vi.fn()
        .mockResolvedValueOnce({
          data: null,
          error: mockError
        })
        .mockResolvedValueOnce({
          data: { test: 'data' },
          error: null
        });

      const result = await apiCall(mockApiFunction, { retryOnRateLimit: true });

      expect(result.data).toEqual({ test: 'data' });
      expect(result.error).toBeNull();
      expect(mockApiFunction).toHaveBeenCalledTimes(2);
    });
  });

  describe('handleApiError', () => {
    it('sollte einen API-Fehler korrekt verarbeiten', () => {
      const mockError = { message: 'Test error', status: 400, code: 'BAD_REQUEST' };
      const result = handleApiError(mockError);

      expect(result.message).toBe('Test error');
      expect(result.status).toBe(400);
      expect(result.code).toBe('BAD_REQUEST');
    });

    it('sollte einen Standardfehler zurückgeben, wenn keine Nachricht vorhanden ist', () => {
      const mockError = { status: 500 };
      const result = handleApiError(mockError);

      expect(result.message).toBe('Ein unbekannter Fehler ist aufgetreten');
      expect(result.status).toBe(500);
    });
  });

  describe('showApiError', () => {
    it('sollte eine Fehlermeldung für 401 anzeigen', () => {
      const error = new Error('Unauthorized') as Error & ApiError;
      error.status = 401;
      showApiError(error);

      expect(toast.error).toHaveBeenCalledWith('Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.');
    });

    it('sollte eine Fehlermeldung für 429 anzeigen', () => {
      const error = new Error('Rate limit') as Error & ApiError;
      error.status = 429;
      showApiError(error);

      expect(toast.error).toHaveBeenCalledWith('Zu viele Anfragen. Bitte warte kurz...');
    });

    it('sollte eine allgemeine Fehlermeldung anzeigen', () => {
      const error = new Error('Test error');
      showApiError(error);

      expect(toast.error).toHaveBeenCalledWith('Test error');
    });
  });

  describe('showApiSuccess', () => {
    it('sollte eine Erfolgsmeldung anzeigen', () => {
      showApiSuccess('Operation erfolgreich');

      expect(toast.success).toHaveBeenCalledWith('Operation erfolgreich');
    });
  });
}); 