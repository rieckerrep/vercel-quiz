Perfekt! Hier kommt dein strukturierter **Migrationsplan** zur Verlagerung der Logik von deinem Frontend in das Supabase-Backend – inkl. konkreter Schritte, Tabellen, RPC-Ideen und Priorisierung.

---

# 🧠 **Migrationsplan: Frontend → Supabase Backend**

## ✅ Ziel:
Alle kritischen Entscheidungen (XP, Coins, Fortschritt, Item-Verbrauch etc.) sollen **serverseitig** in Supabase getroffen werden. Das Frontend zeigt nur noch das Ergebnis an.

---

## 🧱 **1. Welche Logik wird ausgelagert?**

| Bereich                  | Aktuell im Frontend | Zukünftig im Backend via Supabase |
|--------------------------|---------------------|------------------------------------|
| XP-Vergabe               | ✅ Ja                | ✅ Ja (`submit_answer`)  
| Coins + Belohnung        | ✅ Ja                | ✅ Ja (`submit_answer`)  
| Fortschritt              | ✅ Ja                | ✅ Ja (`answered_questions`)  
| Streak-Logik             | ✅ Ja                | ✅ Optional (`update_streak`)  
| Item-Verbrauch (Joker)   | ✅ Ja                | ✅ Ja (`use_item`)  
| Medaillen                | ✅ Teilweise         | ✅ Ja (`check_medals`)  
| Levelsystem              | ✅ Ja                | ✅ Ja (aus `user_stats` berechenbar)  

---

## 🗂️ **2. Benötigte Tabellen in Supabase**

| Tabelle               | Zweck                                    | Status |
|------------------------|------------------------------------------|--------|
| `answered_questions`   | Welche Fragen wurden wann wie beantwortet | ✅ Vorhanden
| `user_stats`          | Aktueller Stand (XP, Level, Coins etc.)  | ✅ Vorhanden
| `user_progress`       | Fortschritt pro Kapitel/Fragetyp         | ✅ Vorhanden
| `user_items`          | Welche Items hat der User, welche sind aktiv? | ⏳ Neu
| `user_medals`         | Welche Medaillen hat der Nutzer?         | ⏳ Neu

---

## ⚙️ **3. Backend-Funktionen (RPC)**

| RPC-Funktion              | Zweck                                               | Status |
|---------------------------|-----------------------------------------------------|--------|
| `submit_answer(user_id, question_id, is_correct)` | Vergibt XP/Coins, trackt Fortschritt, prüft Medaillen | ⏳ Neu
| `use_item(user_id, item_id)`        | Aktiviert/verbraucht Item | ⏳ Neu
| `check_medals(user_id)`             | Prüft alle Medaillenbedingungen | ⏳ Neu
| `get_quiz_summary(user_id, chapter_id)` | Gibt zurück: XP, Coins, Medaillen, Fortschritt | ⏳ Neu
| `calculate_and_award_xp`            | Berechnet und vergibt XP | ✅ Vorhanden
| `update_level_on_xp_change`         | Aktualisiert Level bei XP-Änderung | ✅ Vorhanden

---

## 🔄 **4. Frontend-Anpassungen**

| Stelle im Code                 | Alt: Frontend-Logik           | Neu: RPC-Aufruf + Anzeige      |
|-------------------------------|-------------------------------|--------------------------------|
| `addXPMutation`               | `mutate({ userId, amount })`  | `submit_answer()`  
| `updateProgress()`            | Zustand setzen                 | Antwort wird geloggt im Backend  
| `useRewardAnimation()`        | XP lokal berechnet             | XP kommt aus RPC-Response  
| `useItem()`                   | Joker lokal verbraucht         | `use_item()` ruft RPC auf  
| `EndScreen.tsx`               | Belohnung lokal berechnet      | Daten kommen aus `get_quiz_summary()`  

---

## 📆 **5. Priorisierte Schritte**

| Phase     | Was wird zuerst umgesetzt?                                      | Status |
|-----------|-----------------------------------------------------------------|--------|
| ✅ Phase 1 | `submit_answer()` RPC mit XP/Coins/Fortschritt | ⏳
| ⏳ Phase 2 | Frontend umstellen auf Anzeige statt Berechnung | ⏳

---

## 📈 **Ergebnis der Migration**

| Vorteil                        | Wirkung                                |
|-------------------------------|----------------------------------------|
| 💼 Manipulationssicher         | Kein XP-Farming durch DevTools  
| 🧩 Modular & wartbar           | Neue Items, Belohnungen nur Backend-seitig anpassen  
| 📊 Echtzeit-Auswertungen       | Fortschritt, Leaderboards aus Backend-Daten  
| 📱 Bereit für App & Public Scaling | Sicheres API-Modell für Mobile-Clients  

---

Wenn du willst, mache ich dir zusätzlich:

✅ eine fertige `submit_answer()`-RPC (PostgreSQL)  
✅ eine Beispiel-Tabelle `user_items`  
✅ das passende Frontend-Hook (`useSubmitAnswerMutation`)  
✅ oder ein automatisiertes Testszenario für Cursor

Sag einfach:  
**„Mach mir `submit_answer()` startklar" oder  
„Gib mir das SQL-Schema für user_items"** – und ich setz es für dich um!