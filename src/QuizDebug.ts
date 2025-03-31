/**
 * Quiz Debug-Modul
 * Steuert den Debug-Modus der Anwendung
 */

import { quizLogger } from './EventLogger';

// Debug-Status
let isDebugMode = false;

// Initialisierung des Debug-Modus
export function initDebugMode(): void {
  // URL-Parameter auf "debug" prüfen
  const debugParam = new URLSearchParams(window.location.search).get('debug');
  isDebugMode = debugParam === 'true' || debugParam === '';
  
  if (isDebugMode) {
    // Debug-Modus aktivieren
    console.log('%c[DEBUG MODE AKTIVIERT]', 'color: white; background: red; padding: 2px 5px; font-weight: bold;');
    
    // Debug-Tools im Fenster verfügbar machen
    (window as any).__QUIZ_DEBUG__ = {
      logger: quizLogger,
      toggleDebug: toggleDebugMode,
      getState: getDebugState,
      exportLogs: exportLogs
    };
    
    // Zeit messen
    performance.mark('debug-start');
    
    // Debug-Status protokollieren
    quizLogger.log('system', 'Debug-Modus aktiviert', {
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString()
    });
  }
}

// Debug-Modus umschalten
export function toggleDebugMode(): boolean {
  isDebugMode = !isDebugMode;
  
  if (isDebugMode) {
    console.log('%c[DEBUG MODE AKTIVIERT]', 'color: white; background: red; padding: 2px 5px; font-weight: bold;');
    quizLogger.log('system', 'Debug-Modus aktiviert');
  } else {
    console.log('%c[DEBUG MODE DEAKTIVIERT]', 'color: white; background: gray; padding: 2px 5px;');
    quizLogger.log('system', 'Debug-Modus deaktiviert');
  }
  
  // URL-Parameter aktualisieren
  const url = new URL(window.location.href);
  if (isDebugMode) {
    url.searchParams.set('debug', 'true');
  } else {
    url.searchParams.delete('debug');
  }
  window.history.replaceState({}, '', url.toString());
  
  // Ereignis auslösen, damit UI aktualisiert wird
  window.dispatchEvent(new CustomEvent('quizDebugToggle', { detail: { isEnabled: isDebugMode } }));
  
  return isDebugMode;
}

// Debug-Status abrufen
export function isDebugEnabled(): boolean {
  return isDebugMode;
}

// Debug-Zustand abrufen
export function getDebugState(): any {
  return {
    isEnabled: isDebugMode,
    events: quizLogger.getEvents(),
    performance: performance.getEntriesByType('measure')
  };
}

// Debug-Logs exportieren
export function exportLogs(): string {
  return quizLogger.exportEvents();
}

// Leistung messen
export function measurePerformance(label: string): void {
  if (!isDebugMode) return;
  
  const endMark = `${label}-end`;
  performance.mark(endMark);
  performance.measure(label, 'debug-start', endMark);
  
  // Leistungswerte protokollieren
  const measurements = performance.getEntriesByName(label, 'measure');
  if (measurements.length > 0) {
    const duration = measurements[0].duration;
    quizLogger.log('system', `Leistungsmessung: ${label}`, { 
      durationMs: duration, 
      durationSec: (duration / 1000).toFixed(2) 
    });
  }
} 