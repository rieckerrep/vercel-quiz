import toast, { ToastPosition } from 'react-hot-toast';

// Maximale Anzahl gleichzeitiger Benachrichtigungen
const MAX_TOASTS = 3;

// Benutzerdefinierte Position für alle Benachrichtigungen
const DEFAULT_POSITION: ToastPosition = 'bottom-left';

// Benutzerdefinierte Stile für die Benachrichtigungen
const toastStyles = {
  style: {
    borderRadius: '10px',
    background: '#333',
    color: '#fff',
    padding: '16px',
    fontSize: '14px',
    maxWidth: '400px',
  },
  duration: 4000,
  position: DEFAULT_POSITION,
};

/**
 * Benachrichtigungsdienst für die Anzeige von Toast-Nachrichten
 */
export const notificationService = {
  /**
   * Zeigt eine Fehlermeldung an
   * @param message Die anzuzeigende Fehlermeldung
   */
  error: (message: string) => {
    // Begrenze die Anzahl der aktiven Benachrichtigungen
    const activeToasts = document.querySelectorAll('[role="status"]');
    if (activeToasts.length >= MAX_TOASTS) {
      // Entferne die älteste Benachrichtigung
      const oldestToast = document.querySelector('[role="status"]');
      if (oldestToast) {
        oldestToast.remove();
      }
    }
    
    toast.error(message, {
      ...toastStyles,
      icon: '❌',
    });
  },

  /**
   * Zeigt eine Erfolgsmeldung an
   * @param message Die anzuzeigende Erfolgsmeldung
   */
  success: (message: string) => {
    // Begrenze die Anzahl der aktiven Benachrichtigungen
    const activeToasts = document.querySelectorAll('[role="status"]');
    if (activeToasts.length >= MAX_TOASTS) {
      // Entferne die älteste Benachrichtigung
      const oldestToast = document.querySelector('[role="status"]');
      if (oldestToast) {
        oldestToast.remove();
      }
    }
    
    toast.success(message, {
      ...toastStyles,
      icon: '✅',
    });
  },

  /**
   * Zeigt eine Informationsmeldung an
   * @param message Die anzuzeigende Informationsmeldung
   */
  info: (message: string) => {
    // Begrenze die Anzahl der aktiven Benachrichtigungen
    const activeToasts = document.querySelectorAll('[role="status"]');
    if (activeToasts.length >= MAX_TOASTS) {
      // Entferne die älteste Benachrichtigung
      const oldestToast = document.querySelector('[role="status"]');
      if (oldestToast) {
        oldestToast.remove();
      }
    }
    
    toast(message, {
      ...toastStyles,
      icon: 'ℹ️',
    });
  },

  /**
   * Zeigt eine Warnmeldung an
   * @param message Die anzuzeigende Warnmeldung
   */
  warning: (message: string) => {
    // Begrenze die Anzahl der aktiven Benachrichtigungen
    const activeToasts = document.querySelectorAll('[role="status"]');
    if (activeToasts.length >= MAX_TOASTS) {
      // Entferne die älteste Benachrichtigung
      const oldestToast = document.querySelector('[role="status"]');
      if (oldestToast) {
        oldestToast.remove();
      }
    }
    
    toast(message, {
      ...toastStyles,
      icon: '⚠️',
    });
  },
}; 