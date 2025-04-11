# API-Dokumentation

## Supabase Integration

### Authentifizierung
```typescript
// authService.ts
export const authService = {
  getSession: async () => {
    return supabase.auth.getSession();
  },
  signOut: async () => {
    return supabase.auth.signOut();
  }
};
```

### Quiz-Service
```typescript
// quizService.ts
export const quizService = {
  // Fragen abrufen
  fetchQuestions: async (chapterId: number) => {
    return supabase
      .from('questions')
      .select('*')
      .eq('chapter_id', chapterId);
  },

  // Antwort speichern
  answerQuestion: async (userId: string, questionId: number, isCorrect: boolean) => {
    return supabase
      .from('answered_questions')
      .insert({
        user_id: userId,
        question_id: questionId,
        is_correct: isCorrect
      });
  }
};
```

### User-Service
```typescript
// userService.ts
export const userService = {
  // XP hinzufügen
  addXp: async (userId: string, xpAmount: number) => {
    return supabase
      .from('user_stats')
      .update({ total_xp: xpAmount })
      .eq('user_id', userId);
  },

  // Medaille hinzufügen
  addMedal: async (userId: string, medalType: 'gold' | 'silver' | 'bronze') => {
    return supabase
      .from('user_stats')
      .update({ [medalType + '_medals']: 1 })
      .eq('user_id', userId);
  }
};
```

## React Query Hooks

### Quiz-Daten
```typescript
// useQuizData.ts
export const useQuestions = (chapterId: number) => {
  return useQuery({
    queryKey: ['questions', chapterId],
    queryFn: () => quizService.fetchQuestions(chapterId),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000
  });
};
```

### Benutzerdaten
```typescript
// useUserData.ts
export const useUserStats = (userId: string) => {
  return useQuery({
    queryKey: ['userStats', userId],
    queryFn: () => userService.fetchUserStats(userId),
    staleTime: 1 * 60 * 1000,
    gcTime: 5 * 60 * 1000
  });
};
```

## Zustand Stores

### Quiz Store
```typescript
// useQuizStore.ts
interface QuizState {
  questions: Question[];
  currentQuestion: Question | null;
  currentQuestionIndex: number;
  // ... weitere Zustände
}

export const useQuizStore = create<QuizState>((set, get) => ({
  // Initialzustände
  questions: [],
  currentQuestion: null,
  currentQuestionIndex: 0,
  // ... weitere Zustände und Aktionen
}));
```

### User Store
```typescript
// useUserStore.ts
interface UserState {
  totalXp: number;
  totalCoins: number;
  userStats: UserStats | null;
  // ... weitere Zustände
}

export const useUserStore = create<UserState>((set) => ({
  // Initialzustände
  totalXp: 0,
  totalCoins: 0,
  userStats: null,
  // ... weitere Zustände und Aktionen
}));
```

## Event Bus

### Quiz Events
```typescript
// quizEventBus.ts
export type QuizEvent = 
  | { type: 'ANSWER_SUBMITTED'; payload: QuizAnswerInsert }
  | { type: 'QUIZ_COMPLETED'; payload: { userId: string; chapterId: number } }
  | { type: 'PROGRESS_UPDATED'; payload: QuizProgress }
  | { type: 'REWARDS_UPDATED'; payload: QuizRewards };
```

## Datenbank-Schema

### Wichtige Tabellen

#### questions
```sql
CREATE TABLE questions (
  id SERIAL PRIMARY KEY,
  chapter_id INTEGER,
  question_text TEXT,
  correct_answer TEXT,
  explanation TEXT,
  xp_reward INTEGER
);
```

#### user_stats
```sql
CREATE TABLE user_stats (
  user_id UUID PRIMARY KEY,
  total_xp INTEGER,
  total_coins INTEGER,
  gold_medals INTEGER,
  silver_medals INTEGER,
  bronze_medals INTEGER,
  questions_answered INTEGER,
  correct_answers INTEGER
);
```

#### answered_questions
```sql
CREATE TABLE answered_questions (
  id SERIAL PRIMARY KEY,
  user_id UUID,
  question_id INTEGER,
  is_correct BOOLEAN,
  answered_at TIMESTAMP
);
```

## Fehlerbehandlung

### API-Fehler
```typescript
try {
  const { data, error } = await supabase
    .from('questions')
    .select('*');
  
  if (error) throw error;
  return data;
} catch (error) {
  console.error('Fehler beim Laden der Fragen:', error);
  throw error;
}
```

### React Query Fehler
```typescript
const { data, error } = useQuery({
  queryKey: ['questions'],
  queryFn: fetchQuestions,
  onError: (error) => {
    console.error('Fehler beim Laden der Daten:', error);
  }
});
```

## Performance-Optimierungen

### Caching-Strategien
```typescript
// Optimierte Query-Konfiguration
const queryConfig = {
  staleTime: 5 * 60 * 1000,  // 5 Minuten
  gcTime: 30 * 60 * 1000,    // 30 Minuten
  refetchOnWindowFocus: false,
  retry: 1
};
```

### Batch-Updates
```typescript
// Mehrere Updates in einer Transaktion
const updateUserStats = async (userId: string, updates: Partial<UserStats>) => {
  return supabase
    .from('user_stats')
    .update(updates)
    .eq('user_id', userId);
};
``` 