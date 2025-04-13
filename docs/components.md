# Komponenten-Dokumentation

## QuizContainer

### Beschreibung
Die Hauptkomponente des Quiz-Systems. Verwaltet den gesamten Quiz-Fluss und koordiniert die Interaktion zwischen verschiedenen Komponenten.

### Props
```typescript
interface QuizContainerProps {
  user: User | null;
  profile: Profile | null;
  onOpenProfile: () => void;
  onOpenShop: () => void;
  onOpenLeaderboard: () => void;
  onOpenSettings: () => void;
}
```

### Wichtige Funktionen
- `handleAnswer`: Verarbeitet die Antwort des Benutzers
- `nextQuestion`: Navigiert zur nächsten Frage
- `finalizeQuiz`: Beendet das Quiz und aktualisiert Statistiken
- `computeXp`: Berechnet XP-Belohnungen

### Verwendete Hooks
- `useQuizStore`: Quiz-Zustand
- `useUserStore`: Benutzerdaten
- `useSoundStore`: Sound-Effekte
- `useQuizData`: Datenabfragen

## QuestionComponent

### Beschreibung
Basis-Komponente für alle Fragetypen. Wird von spezifischen Fragetyp-Komponenten erweitert.

### Props
```typescript
interface QuestionProps {
  question: Question;
  onAnswer: (answer: string) => void;
  isAnswered: boolean;
  showExplanation: boolean;
}
```

### Fragetypen
1. **MultipleChoiceQuestion**
   - Mehrere Antwortmöglichkeiten
   - Einzelauswahl
   - Visuelles Feedback

2. **TrueFalseQuestion**
   - Wahr/Falsch Auswahl
   - Direktes Feedback
   - Einfache Benutzeroberfläche

3. **DragDropQuestion**
   - Drag & Drop Interaktion
   - Visuelle Elemente
   - Sofortige Validierung

4. **FreeTextQuestion**
   - Freitext-Eingabe
   - Validierung nach Submit
   - Erweiterte Erklärungen

## EndScreen

### Beschreibung
Zeigt die Ergebnisse des Quiz an, inklusive XP, Medaillen und Statistiken.

### Props
```typescript
interface EndScreenProps {
  roundXp: number;
  possibleRoundXp: number;
  roundCoins: number;
  medalType: string;
  showLevelUpAnimation: boolean;
  onRestart: () => void;
  onOpenLeaderboard: () => void;
  onOpenShop: () => void;
  onOpenProfile: () => void;
  correctAnswers: number;
}
```

### Features
- XP-Anzeige
- Medaillen-Animation
- Level-Up Animation
- Fortschrittsanzeige
- Statistiken

## ProgressBar

### Beschreibung
Zeigt den Fortschritt im Quiz an.

### Props
```typescript
interface ProgressBarProps {
  progress: number;
  totalQuestions: number;
  currentQuestion: number;
}
```

### Features
- Visueller Fortschrittsbalken
- Fragenzähler
- Animierte Übergänge

## JokerPanel

### Beschreibung
Verwaltet die verfügbaren Joker und deren Verwendung.

### Props
```typescript
interface JokerPanelProps {
  xpBoostUsed: boolean;
  streakBoostUsed: boolean;
  fiftyFiftyUsed: boolean;
  hintUsed: boolean;
  onUseJoker: (jokerType: JokerType) => void;
}
```

### Joker-Typen
1. **XP-Boost**
   - Erhöht XP-Belohnung
   - Einmalige Verwendung

2. **Streak-Boost**
   - Erhöht Streak-Multiplikator
   - Temporärer Effekt

3. **50:50**
   - Entfernt falsche Antworten
   - Sofortige Wirkung

4. **Hinweis**
   - Zeigt Tipp an
   - Reduziert XP-Belohnung

## Leaderboard

### Beschreibung
Zeigt die Rangliste der Spieler an.

### Props
```typescript
interface LeaderboardProps {
  users: LeaderboardUser[];
  currentUser: User | null;
  onClose: () => void;
}
```

### Features
- Top-Spieler Liste
- Aktueller Spieler Highlight
- Sortierung nach XP
- Animierte Updates

## ProfileScreen

### Beschreibung
Zeigt das Benutzerprofil und Statistiken an.

### Props
```typescript
interface ProfileScreenProps {
  user: User;
  profile: Profile;
  stats: UserStats;
  onBack: () => void;
}
```

### Features
- Benutzerinformationen
- Statistiken
- Medaillen-Übersicht
- Level-Fortschritt

## SoundManager

### Beschreibung
Verwaltet Sound-Effekte im Quiz.

### Props
```typescript
interface SoundManagerProps {
  isMuted: boolean;
  volume: number;
  onToggleMute: () => void;
  onSetVolume: (volume: number) => void;
}
```

### Sound-Effekte
- Richtige Antwort
- Falsche Antwort
- Level-Up
- Medaille erhalten

## Responsive Design

### Breakpoints
```css
/* Mobile */
@media (max-width: 640px) {
  /* Mobile-spezifische Styles */
}

/* Tablet */
@media (min-width: 641px) and (max-width: 1024px) {
  /* Tablet-spezifische Styles */
}

/* Desktop */
@media (min-width: 1025px) {
  /* Desktop-spezifische Styles */
}
```

### Mobile Optimierungen
- Touch-freundliche Buttons
- Angepasste Schriftgrößen
- Optimierte Layouts
- Performance-Optimierungen

## Animationen

### Framer Motion
```typescript
// Beispiel für eine Frage-Animation
const questionAnimation = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
};
```

### CSS Transitions
```css
/* Smooth transitions */
.transition-all {
  transition: all 0.3s ease-in-out;
}
```

## Performance-Optimierungen

### Lazy Loading
```typescript
// Dynamische Komponenten-Importe
const QuestionComponent = lazy(() => import('./QuestionComponent'));
```

### Memoization
```typescript
// Optimierte Komponenten
const MemoizedComponent = memo(Component, (prevProps, nextProps) => {
  return prevProps.value === nextProps.value;
});
```

### Code Splitting
```typescript
// Route-basiertes Code Splitting
const routes = [
  {
    path: '/quiz',
    component: lazy(() => import('./QuizContainer'))
  }
];
``` 