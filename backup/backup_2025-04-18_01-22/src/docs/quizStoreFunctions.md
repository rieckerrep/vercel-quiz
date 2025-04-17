# QuizStore Funktionen Dokumentation

## 1. Daten-Management & Zustandsverwaltung

### Hauptdaten
- `questions`: Question[] - Array aller Fragen
- `currentQuestion`: Question | null - Aktuelle Frage
- `currentQuestionIndex`: number - Index der aktuellen Frage
- `totalQuestions`: number - Gesamtanzahl der Fragen
- `answeredQuestions`: number[] - IDs der beantworteten Fragen

### Lade-Zustände
- `isQuestionsLoading`: boolean - Ladezustand der Fragen
- `questionsError`: Error | null - Fehler beim Laden
- `isLoading`: boolean - Allgemeiner Ladezustand

### Quiz-Status
- `isQuizActive`: boolean - Quiz aktiv
- `isQuizEnd`: boolean - Quiz beendet
- `isAnswerSubmitted`: boolean - Antwort abgegeben
- `showExplanation`: boolean - Erklärung anzeigen
- `lastAnswerCorrect`: boolean | null - Letzte Antwort korrekt

## 2. Hauptfunktionen für Quiz-Logik

### Fragen-Management
- `fetchQuestions(chapterId: number)`: Promise<void> - Fragen laden
- `initQuiz()`: Promise<void> - Quiz initialisieren
- `resetQuiz()`: void - Quiz zurücksetzen

### Antwort-Verarbeitung
- `handleAnswer(questionId: number, answer: string)`: Promise<boolean> - Antwort verarbeiten
- `handleFinalAnswer(questionId: number, answer: string)`: Promise<void> - Endgültige Antwort
- `handleTrueFalseAnswer(questionId: number, answer: boolean)`: Promise<void> - Wahr/Falsch Antwort
- `handleSubquestionAnswered(subId: number, isCorrect: boolean, overallQuestionId: number)`: Promise<void> - Unterfrage beantwortet
- `awardQuestion(questionId: number, isCorrect: boolean)`: Promise<boolean> - Frage belohnen
- `awardSubquestion(subId: number, isCorrect: boolean, overallQuestionId: number)`: Promise<boolean> - Unterfrage belohnen

## 3. Navigation & Fortschritt

### Navigation
- `nextQuestion()`: void - Nächste Frage
- `previousQuestion()`: void - Vorherige Frage
- `handleNavigation(idx: number)`: void - Navigation zu Index
- `handleQuestionNavigation(idx: number)`: void - Frage-Navigation

### Fortschritt
- `progress`: number - Fortschrittsanzeige
- `calculateProgress()`: number - Fortschritt berechnen
- `checkQuizEnd()`: void - Quiz-Ende prüfen
- `finalizeQuiz()`: void - Quiz abschließen

## 4. Belohnungssystem

### Belohnungen
- `roundXp`: number - XP pro Runde
- `roundCoins`: number - Münzen pro Runde
- `possibleRoundXp`: number - Mögliche XP
- `rewardXp`: number - Belohnung XP
- `rewardCoins`: number - Belohnung Münzen

### Belohnungs-Funktionen
- `computeXp()`: void - XP berechnen
- `computePossibleXp()`: Promise<void> - Mögliche XP berechnen
- `updateUserStats()`: Promise<void> - Benutzerstatistiken aktualisieren

## 5. Animation & Sound

### Animation-Zustände
- `showRewardAnimation`: boolean - Belohnungsanimation anzeigen
- `isAnimationPlaying`: boolean - Animation läuft
- `showLevelUpAnimation`: boolean - Level-Up Animation anzeigen

### Animation-Funktionen
- `showRewardAnimationWithSound(isCorrect: boolean)`: Promise<void> - Animation mit Sound
- `hideRewardAnimation()`: void - Animation ausblenden
- `startAnimation()`: void - Animation starten

### Sound
- `playCorrectSound()`: Promise<void> - Korrekt-Sound
- `playWrongSound()`: Promise<void> - Falsch-Sound

## 6. UI-Steuerung

### UI-Zustände
- `showNavigation`: boolean - Navigation anzeigen
- `showJokerPanel`: boolean - Joker-Panel anzeigen
- `showLeaderboard`: boolean - Bestenliste anzeigen
- `selectedAnswer`: string | null - Ausgewählte Antwort
- `userInputAnswer`: string - Benutzereingabe

### UI-Funktionen
- `toggleJokerPanel()`: void - Joker-Panel umschalten
- `toggleLeaderboard()`: void - Bestenliste umschalten

## 7. Joker-System

### Joker-Zustände
- `xpBoostUsed`: boolean - XP-Boost verwendet
- `streakBoostUsed`: boolean - Streak-Boost verwendet
- `fiftyFiftyUsed`: boolean - 50:50 verwendet
- `hintUsed`: boolean - Hinweis verwendet

## 8. Statistik & Tracking

### Statistik-Zustände
- `correctAnswers`: number - Korrekte Antworten
- `wrongAnswers`: number - Falsche Antworten
- `streak`: number - Aktuelle Serie
- `maxStreak`: number - Maximale Serie

### Tracking-Funktionen
- `incrementLocalCorrectAnswers()`: void - Korrekte Antworten erhöhen
- `incrementLocalWrongAnswers()`: void - Falsche Antworten erhöhen
- `updateStreak(correct: boolean)`: void - Serie aktualisieren
- `logQuizCompleted(totalXp: number, possibleXp: number, medal: string, answeredCount: number, correctCount: number)`: void - Quiz-Abschluss protokollieren

## 9. Unterfragen-System

### Unterfragen-Zustände
- `subQuestions`: Question[] - Unterfragen
- `subQuestionResults`: Record<number, boolean> - Unterfragen-Ergebnisse

### Unterfragen-Funktionen
- `setSubQuestions(questions: Question[])`: void - Unterfragen setzen
- `setSubQuestionResult(id: number, isCorrect: boolean)`: void - Unterfragen-Ergebnis setzen

## 10. Drag & Drop / Multiple Choice

### Spezielle Antwort-Typen
- `correctDragDropAnswer`: string | null - Korrekte Drag&Drop Antwort
- `correctMultipleChoiceAnswer`: string | null - Korrekte Multiple Choice Antwort 