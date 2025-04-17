import { vi } from 'vitest';
import { createMockSession } from './session';

export const mockSupabase = {
  from: vi.fn(),
  rpc: vi.fn(),
  auth: {
    getSession: vi.fn().mockResolvedValue({
      data: {
        session: createMockSession()
      },
      error: null
    })
  }
};

export const mockNotificationService = {
  showSuccess: vi.fn(),
  showError: vi.fn(),
  showInfo: vi.fn(),
  showWarning: vi.fn(),
  showErrorFromCode: vi.fn(),
  showSuccessFromCode: vi.fn()
}; 