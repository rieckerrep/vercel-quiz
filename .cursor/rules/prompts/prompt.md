# Ziel
Erstelle eine skalierbare API-Architektur in einem React-Projekt (Vite + Supabase + Zustand + Tailwind), um alle API-Calls über zentrale Service-Dateien abzuwickeln.  

Die Architektur soll folgende Anforderungen erfüllen:

## 🔁 1. Zentrale API-Struktur
- Erstelle einen Ordner `src/api/` mit:
  - `apiClient.ts`: zentrale Supabase/Fetch-Instanz mit Header-Handling
  - `authService.ts`: Login, Logout, Token
  - `quizService.ts`: Quiz-Fortschritt, Fragen laden
  - `userService.ts`: XP, Coins, Profil speichern
  - `shopService.ts`: Avatar, Medaillen, Käufe

## 🛡 2. Token-Handling & Authentifizierung
- Greife auf das Supabase-Session-Token zu (entweder aus Supabase selbst oder `localStorage`)
- Füge den Token als `Authorization: Bearer <token>` automatisch an alle Requests an
- Wenn kein Token vorhanden ist: Fehler zurückgeben (`401`) oder Redirect auslösen

## ❌ 3. Globale Fehlerbehandlung
- Jeder Request soll in einen Try-Catch-Wrapper gepackt werden
- Bei Fehlern:
  - Wenn `401`: automatisch Logout oder Login-Redirect triggern
  - Wenn `429`: Hinweis auf Rate-Limit anzeigen (`"Bitte warte kurz..."`)
  - Alle anderen Fehler: mit `react-hot-toast` anzeigen
- Optional: globale Error-Middleware oder Wrapper-Funktion (`handleApiError()`)

## ⚠️ 4. Rate-Limit-Schutz
- Füge optional ein Delay- oder Queue-System ein (z. B. mit `p-limit` oder eigener Debounce-Logik), das Anfragen bei hoher Last puffert
- Wenn Supabase-Fehlermeldung `429` empfangen wird:
  - Warte 3 Sekunden und wiederhole maximal 2x
  - Wenn immer noch Fehler: Abbruch und Toast

## 💾 5. Erweiterbarkeit
- Alle Services sollen einfache Funktionen exportieren wie:
  - `getQuizById(id: string)`
  - `submitAnswer(questionId, answer)`
  - `purchaseAvatar(avatarId)`
- Diese Funktionen sollen in React-Komponenten oder Zustand-Stores verwendet werden können
- Keine direkte Toast-, UI- oder Redirect-Logik in den Services selbst (Trennung von Logik & UI!)

## 🧪 6. Optional: Beispielstruktur
- `src/api/apiClient.ts`: zentraler Supabase-Client mit Token
- `src/api/handleError.ts`: zentrale Fehlerbehandlung
- `src/api/authService.ts`: login(), logout(), getSession()
- `src/api/userService.ts`: getProfile(), updateProfile()
- `src/api/quizService.ts`: loadQuestions(), submitAnswer()
- `src/api/shopService.ts`: buyAvatar(), getAvatars()
- `src/store/`: Zustand-Stores verwenden nur diese Services
- Token persistieren via Supabase-Session oder `localStorage`

## 📦 Packages (bereits vorhanden oder installieren)
- `@supabase/supabase-js`
- `zustand`
- `react-hot-toast`
- optional: `p-limit` für Rate-Limits oder `axios` für erweitertes Error-Handling

## 🧠 Besondere Hinweise:
- Später soll das System auch mit einem Wix-Frontend interagieren können (Supabase-Token wird übergeben)
- Stelle sicher, dass Tokens & Fehler dort auch nachvollziehbar behandelt werden können
- Verwende TypeScript mit präzisen Rückgabetypen
