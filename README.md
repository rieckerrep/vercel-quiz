# RieckerRep Quiz

## 📋 Projektübersicht
Ein juristisches Quiz-System für RieckerRep, das in Wix integriert werden kann. Das System verwendet Supabase als Backend und ist für die Integration in Wix über iFrame oder HTML optimiert.

## 🚀 Features
- Juristisches Quiz mit verschiedenen Fragetypen
- XP- und Medaillensystem
- Responsive Design für Web und Mobile
- Supabase-Backend-Integration
- Wix-Integration über iFrame/HTML
- Fortschrittsverfolgung und Statistiken

## 🛠 Technologie-Stack
- React
- TypeScript
- Zustand (State Management)
- React Query (Data Fetching)
- Supabase (Backend)
- Tailwind CSS (Styling)

## 📁 Projektstruktur
```
src/
├── api/                 # API-Integration
│   ├── authService.ts   # Authentifizierung
│   ├── quizService.ts   # Quiz-Funktionen
│   ├── userService.ts   # Benutzer-Funktionen
│   └── shopService.ts   # Shop-Funktionen
├── components/          # UI-Komponenten
├── hooks/              # Custom Hooks
│   └── quiz/           # Quiz-spezifische Hooks
├── store/              # Zustand Stores
├── types/              # TypeScript-Definitionen
└── lib/                # Hilfsfunktionen
```

## 🔑 Wichtige Dateien
- `src/QuizContainer.tsx` - Hauptkomponente
- `src/store/useQuizStore.ts` - Quiz-Zustand
- `src/hooks/quiz/useQuizData.ts` - Datenabfragen
- `src/api/quizService.ts` - Quiz-API

## 💾 Datenbankstruktur (Supabase)
### Wichtige Tabellen
- `questions` - Quiz-Fragen
- `user_stats` - Benutzerstatistiken
- `profiles` - Benutzerprofile
- `answered_questions` - Beantwortete Fragen
- `quiz_completions` - Quiz-Abschlüsse

## 🔄 Datenfluss
1. Fragen werden aus Supabase geladen
2. Antworten werden validiert
3. XP und Medaillen werden berechnet
4. Statistiken werden aktualisiert
5. Fortschritt wird gespeichert

## 🎮 Quiz-Logik
### Fragetypen
- Multiple Choice
- True/False
- Drag & Drop
- Freitext

### Belohnungssystem
- XP für richtige Antworten
- Medaillen (Gold, Silber, Bronze)
- Streak-Bonus
- Level-System

## 📱 Responsive Design
- Mobile-first Ansatz
- Anpassungsfähige Layouts
- Touch-freundliche Interaktionen
- Optimierte Performance

## 🔒 Sicherheit
- Supabase Auth
- Geschützte Routen
- Datenvalidierung
- Rate Limiting

## 🚀 Getting Started
1. Repository klonen
2. Abhängigkeiten installieren: `npm install`
3. Umgebungsvariablen konfigurieren
4. Entwicklungsserver starten: `npm run dev`

## ⚙️ Konfiguration
### Umgebungsvariablen
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key
```

## 📦 Build & Deployment
1. Build erstellen: `npm run build`
2. Statische Dateien in Wix hochladen
3. iFrame/HTML in Wix einbinden

## 🔍 Testing
- Unit Tests: `npm test`
- Integration Tests: `npm run test:integration`
- E2E Tests: `npm run test:e2e`

## 📝 Dokumentation
- [API-Dokumentation](docs/api.md)
- [Datenbank-Schema](docs/database.md)
- [Komponenten-Übersicht](docs/components.md)
- [State Management](docs/state.md)

## 🤝 Contributing
1. Fork erstellen
2. Feature-Branch erstellen
3. Änderungen committen
4. Pull Request erstellen

## 📄 Lizenz
Proprietär - Alle Rechte vorbehalten

## 📞 Support
Bei Fragen oder Problemen:
- E-Mail: support@riekerrep.de
- GitHub Issues
