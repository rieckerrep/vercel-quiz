import { quizLogger } from './EventLogger';

/**
 * Quiz-Event-API - Vereinfacht das Protokollieren von Quiz-Ereignissen
 */

// Frage angezeigt
export function logQuestionShown(questionId: number, questionType: string): void {
  quizLogger.log('question', `Frage ${questionId} angezeigt`, { 
    id: questionId, 
    type: questionType 
  });
}

// Antwort gegeben
export function logAnswerGiven(
  questionId: number, 
  isCorrect: boolean, 
  answer?: string, 
  correctAnswer?: string
): void {
  quizLogger.log('answer', `Antwort auf Frage ${questionId}: ${isCorrect ? 'Richtig' : 'Falsch'}`, { 
    id: questionId, 
    isCorrect, 
    answer, 
    correctAnswer 
  });
}

// XP und Münzen erhalten
export function logScoreUpdate(
  xpBefore: number, 
  xpAfter: number, 
  coinsBefore: number, 
  coinsAfter: number
): void {
  quizLogger.log('score', `XP: ${xpBefore} → ${xpAfter}, Münzen: ${coinsBefore} → ${coinsAfter}`, { 
    xpDelta: xpAfter - xpBefore, 
    coinsDelta: coinsAfter - coinsBefore 
  });
}

// Navigation zu einer anderen Frage
export function logNavigation(fromQuestionIndex: number, toQuestionIndex: number): void {
  quizLogger.log('navigation', `Navigation von Frage ${fromQuestionIndex + 1} zu ${toQuestionIndex + 1}`);
}

// Joker verwendet
export function logJokerUsed(jokerType: string): void {
  quizLogger.log('system', `Joker verwendet: ${jokerType}`);
}

// Quiz abgeschlossen
export function logQuizCompleted(
  totalXp: number, 
  possibleXp: number, 
  medal: string, 
  answeredCount: number, 
  correctCount: number
): void {
  quizLogger.log('system', `Quiz abgeschlossen`, { 
    totalXp, 
    possibleXp, 
    medal, 
    performance: `${correctCount}/${answeredCount} korrekt`,
    percentage: Math.round((correctCount / answeredCount) * 100)
  });
}

// Fehler aufgetreten
export function logError(message: string, error?: any): void {
  quizLogger.log('error', message, error);
}

// Benutzerereignisse
export function logUserEvent(action: string, details?: any): void {
  quizLogger.log('auth', action, details);
}

// Supabase API-Aufrufe (für Debugging)
export function logSupabaseCall(endpoint: string, method: string, success: boolean, details?: any): void {
  quizLogger.log('system', `Supabase ${method} ${endpoint}: ${success ? 'Erfolg' : 'Fehler'}`, details);
} 