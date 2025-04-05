export const ERROR_MESSAGES = {
  // Quiz-bezogene Fehler
  QUIZ: {
    LOAD_QUESTIONS: 'Fehler beim Laden der Fragen',
    SAVE_ANSWER: 'Fehler beim Speichern deiner Antwort',
    LOAD_STATS: 'Deine Statistiken konnten nicht geladen werden',
    QUIZ_NOT_FOUND: 'Das Quiz wurde nicht gefunden',
    NO_QUESTIONS: 'Keine Fragen verfügbar'
  },

  // Benutzer-bezogene Fehler
  USER: {
    NOT_LOGGED_IN: 'Du bist nicht angemeldet',
    SESSION_EXPIRED: 'Deine Sitzung ist abgelaufen. Bitte melde dich erneut an',
    PROFILE_UPDATE: 'Fehler beim Aktualisieren deines Profils',
    STATS_UPDATE: 'Fehler beim Aktualisieren deiner Statistiken'
  },

  // Netzwerk-Fehler
  NETWORK: {
    CONNECTION: 'Keine Internetverbindung',
    TIMEOUT: 'Die Anfrage hat zu lange gedauert',
    SERVER: 'Der Server ist momentan nicht erreichbar'
  },

  // Datenbank-Fehler
  DATABASE: {
    CONNECTION: 'Verbindung zur Datenbank fehlgeschlagen',
    QUERY: 'Fehler bei der Datenbankabfrage',
    UPDATE: 'Daten konnten nicht gespeichert werden'
  },

  // Allgemeine Fehler
  GENERAL: {
    UNKNOWN: 'Ein unerwarteter Fehler ist aufgetreten',
    RETRY: 'Bitte versuche es später erneut',
    CONTACT_SUPPORT: 'Bitte kontaktiere den Support, wenn das Problem weiterhin besteht',
    NETWORK_ERROR: 'Netzwerkfehler. Bitte überprüfe deine Internetverbindung.'
  },

  // Erfolgs-Meldungen
  SUCCESS: {
    ANSWER_SAVED: 'Deine Antwort wurde gespeichert',
    PROFILE_UPDATED: 'Dein Profil wurde aktualisiert',
    STATS_UPDATED: 'Deine Statistiken wurden aktualisiert'
  },

  // Authentifizierungs-Fehler
  AUTH: {
    LOGIN_FAILED: 'Anmeldung fehlgeschlagen. Bitte überprüfe deine Eingaben.',
    LOGOUT_FAILED: 'Abmeldung fehlgeschlagen. Bitte versuche es erneut.',
    SOCIAL_LOGIN_FAILED: 'Anmeldung mit externem Dienst fehlgeschlagen',
    PASSWORD_RESET_FAILED: 'Passwort zurücksetzen fehlgeschlagen',
    PASSWORD_CHANGE_FAILED: 'Passwort ändern fehlgeschlagen'
  }
} as const;

// Hilfsfunktion für formatierte Fehlermeldungen
export const formatError = (message: string, details?: string) => {
  return details ? `${message}: ${details}` : message;
}; 