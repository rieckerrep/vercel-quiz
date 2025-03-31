/**
 * EventLogger-Klasse, die Ereignisse im Quiz protokolliert und im Debug-Modus anzeigt
 */

type EventType = 'question' | 'answer' | 'navigation' | 'score' | 'error' | 'auth' | 'system';

interface LogEvent {
  type: EventType;
  message: string;
  timestamp: string;
  details?: any;
}

class QuizEventLogger {
  private static instance: QuizEventLogger;
  private events: LogEvent[] = [];
  private isDebugMode: boolean = false;
  private maxEvents: number = 100;

  private constructor() {
    // Prüfen, ob wir im Debug-Modus sind
    this.isDebugMode = new URLSearchParams(window.location.search).has('debug');
  }

  public static getInstance(): QuizEventLogger {
    if (!QuizEventLogger.instance) {
      QuizEventLogger.instance = new QuizEventLogger();
    }
    return QuizEventLogger.instance;
  }

  /**
   * Protokolliert ein Ereignis im Quiz
   */
  public log(type: EventType, message: string, details?: any): void {
    const event: LogEvent = {
      type,
      message,
      timestamp: new Date().toISOString(),
      details
    };

    this.events.unshift(event); // Neues Ereignis am Anfang einfügen
    
    // Liste auf maximale Anzahl begrenzen
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(0, this.maxEvents);
    }

    // Im Debug-Modus in der Konsole anzeigen
    if (this.isDebugMode) {
      console.log(`%c[${type.toUpperCase()}]`, this.getTypeStyle(type), message, details || '');
    }
  }

  /**
   * Gibt alle protokollierten Ereignisse zurück
   */
  public getEvents(): LogEvent[] {
    return [...this.events];
  }

  /**
   * Löscht alle protokollierten Ereignisse
   */
  public clearEvents(): void {
    this.events = [];
    if (this.isDebugMode) {
      console.log('%c[SYSTEM]', 'color: gray', 'Event-Log gelöscht');
    }
  }

  /**
   * Exportiert alle Ereignisse als JSON
   */
  public exportEvents(): string {
    return JSON.stringify(this.events, null, 2);
  }

  /**
   * Definiert den Stil für verschiedene Ereignistypen in der Konsole
   */
  private getTypeStyle(type: EventType): string {
    switch (type) {
      case 'question': return 'color: #4CAF50; font-weight: bold';
      case 'answer': return 'color: #2196F3; font-weight: bold';
      case 'navigation': return 'color: #9C27B0; font-weight: bold';
      case 'score': return 'color: #FF9800; font-weight: bold';
      case 'error': return 'color: #F44336; font-weight: bold; background: #FFEBEE';
      case 'auth': return 'color: #3F51B5; font-weight: bold';
      case 'system': return 'color: #607D8B; font-weight: bold';
      default: return 'color: black';
    }
  }
}

// Export der Singleton-Instanz
export const quizLogger = QuizEventLogger.getInstance(); 