# State Management Dokumentation

## Übersicht

Das State Management basiert auf einer Kombination von Zustand und React Query:

1. **Zustand Stores** für UI-State und lokale Werte
2. **React Query** für Server-State und Caching
3. **Event Bus** für lose Kopplung zwischen Komponenten

## Zustand Stores

### Quiz Store (`useQuizStore.ts`)

#### Zustände
```typescript
interface QuizState {
  // Fragen-Management
  questions: Question[];
  currentQuestion: Question | null;
  currentQuestionIndex: number;
  
  // Quiz-Status
  isQuizActive: boolean;
  isAnswerSubmitted: boolean;
  selectedAnswer: string | null;
  isCorrect: boolean | null;
  
  // Fortschritt
  progress: number;
  correctAnswers: number;
  wrongAnswers: number;
  streak: number;
  
  // Belohnungen
  roundXp: number;
  roundCoins: number;
  possibleRoundXp: number;
}
```

#### Wichtige Aktionen
```typescript
// Fragen laden
fetchQuestions: async (chapterId: number) => {
  const { data, error } = await quizService.fetchQuestions(chapterId);
  if (error) throw error;
  set({ questions: data });
},

// Antwort verarbeiten
handleAnswer: async (answer: string) => {
  const isCorrect = validateAnswer(answer);
  await awardQuestion(isCorrect);
  set({ isCorrect, selectedAnswer: answer });
},

// Quiz beenden
finalizeQuiz: async () => {
  const { roundXp, correctAnswers } = get();
  await logQuizCompleted(roundXp, correctAnswers);
  set({ isQuizEnd: true });
}
```

### User Store (`useUserStore.ts`)

#### Zustände
```typescript
interface UserState {
  totalXp: number;
  totalCoins: number;
  userStats: UserStats | null;
  isLoading: boolean;
  error: string | null;
}
```

#### Wichtige Aktionen
```typescript
// XP hinzufügen
addXp: async (amount: number) => {
  const { data, error } = await userService.addXp(amount);
  if (error) throw error;
  set({ totalXp: data.total_xp });
},

// Statistiken aktualisieren
updateStats: async (stats: Partial<UserStats>) => {
  const { data, error } = await userService.updateStats(stats);
  if (error) throw error;
  set({ userStats: data });
}
```

### Sound Store (`useSoundStore.ts`)

#### Zustände
```typescript
interface SoundState {
  isMuted: boolean;
  volume: number;
  isSoundPlaying: boolean;
}
```

#### Wichtige Aktionen
```typescript
// Sound abspielen
playSound: async (soundType: 'correct' | 'wrong') => {
  if (isMuted) return;
  const sound = soundType === 'correct' ? correctSound : wrongSound;
  await sound.play();
},

// Stummschalten
toggleMute: () => {
  set({ isMuted: !get().isMuted });
}
```

## React Query Integration

### Query Keys
```typescript
export const queryKeys = {
  questions: (chapterId: number) => ['questions', chapterId],
  userStats: (userId: string) => ['userStats', userId],
  answeredQuestions: (userId: string) => ['answeredQuestions', userId]
};
```

### Wichtige Queries
```typescript
// Fragen abrufen
const useQuestions = (chapterId: number) => {
  return useQuery({
    queryKey: queryKeys.questions(chapterId),
    queryFn: () => quizService.fetchQuestions(chapterId),
    staleTime: 5 * 60 * 1000
  });
};

// Benutzerstatistiken
const useUserStats = (userId: string) => {
  return useQuery({
    queryKey: queryKeys.userStats(userId),
    queryFn: () => userService.fetchUserStats(userId),
    staleTime: 1 * 60 * 1000
  });
};
```

### Mutations
```typescript
// Antwort speichern
const useSaveAnswer = () => {
  return useMutation({
    mutationFn: (answer: Answer) => quizService.saveAnswer(answer),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['answeredQuestions'] });
    }
  });
};

// XP aktualisieren
const useUpdateXp = () => {
  return useMutation({
    mutationFn: (xp: number) => userService.addXp(xp),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userStats'] });
    }
  });
};
```

## Event Bus

### Event Types
```typescript
type QuizEvent = 
  | { type: 'ANSWER_SUBMITTED'; payload: Answer }
  | { type: 'QUIZ_COMPLETED'; payload: QuizCompletion }
  | { type: 'PROGRESS_UPDATED'; payload: Progress }
  | { type: 'REWARDS_UPDATED'; payload: Rewards };
```

### Event Handler
```typescript
const handleAnswerSubmitted = (answer: Answer) => {
  quizEventBus.emit('ANSWER_SUBMITTED', answer);
};

const handleQuizCompleted = (completion: QuizCompletion) => {
  quizEventBus.emit('QUIZ_COMPLETED', completion);
};
```

## State Synchronisation

### Store Updates
```typescript
// Quiz Store aktualisieren
const updateQuizState = (updates: Partial<QuizState>) => {
  useQuizStore.setState(updates);
};

// User Store aktualisieren
const updateUserState = (updates: Partial<UserState>) => {
  useUserStore.setState(updates);
};
```

### Query Invalidation
```typescript
// Queries nach Update invalidieren
const invalidateQueries = () => {
  queryClient.invalidateQueries({ queryKey: ['questions'] });
  queryClient.invalidateQueries({ queryKey: ['userStats'] });
};
```

## Performance Optimierungen

### Zustand Updates
```typescript
// Batch Updates
const updateMultipleStates = () => {
  useQuizStore.setState(state => ({
    ...state,
    progress: newProgress,
    correctAnswers: newCorrectAnswers
  }));
};
```

### Query Optimierungen
```typescript
// Optimierte Query Konfiguration
const queryConfig = {
  staleTime: 5 * 60 * 1000,
  gcTime: 30 * 60 * 1000,
  refetchOnWindowFocus: false,
  retry: 1
};
```

## Fehlerbehandlung

### Store Fehler
```typescript
try {
  await useQuizStore.getState().fetchQuestions(chapterId);
} catch (error) {
  console.error('Fehler beim Laden der Fragen:', error);
  useQuizStore.setState({ error: error.message });
}
```

### Query Fehler
```typescript
const { data, error } = useQuery({
  queryKey: ['questions'],
  queryFn: fetchQuestions,
  onError: (error) => {
    console.error('Fehler beim Laden der Daten:', error);
  }
});
``` 