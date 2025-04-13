
✅ 1. XP- & Coins-System
🔄 Status:
Aktuell lokal im Zustand verwaltet (useQuizRewards)

XP werden direkt nach Antwort lokal berechnet

📦 Ziel:
XP und Münzen bei richtiger Antwort auch im Backend speichern

Coins später im Shop einlösbar

🛠 Umsetzung:
Aufgabe	ToDo
Supabase-Tabelle	user_stats oder Felder in profiles
Mutation	addXP, addCoins
Optional	xp_total, xp_today, coins_total
Optimistisch im UI?	✅ onMutate (XP sofort zeigen)
🥇 2. Medaillen & Erfolge
🔄 Status:
Medaillen werden lokal bei bestimmten Events „verliehen“

📦 Ziel:
Vergebene Medaillen im Backend speichern

Doppelte Vergabe vermeiden

🛠 Umsetzung:
Aufgabe	ToDo
Supabase-Tabelle	unlocked_medals (user_id, medal_id, unlocked_at)
Mutation	unlockMedal(medal_id)
Logik:	vor dem Unlock: check if exists
🎯 3. Fortschritt pro Kapitel
🔄 Status:
Aktuell nur answered_questions gespeichert

Kapitel-Fortschritt (z. B. 4/10 beantwortet) wird lokal berechnet

📦 Ziel:
Pro Kapitel speichern, wie weit der User ist

🛠 Umsetzung:
Aufgabe	ToDo
Supabase-Tabelle	chapter_progress (user_id, chapter_id, correct_count, total_count, updated_at)
Mutation	trackProgress
Verwendung	für Resume-Funktion, Lernfortschritt, Rankings
🧠 4. Joker-Verbrauch
🔄 Status:
Lokal verwaltet (z. B. usedFiftyFifty = true)

📦 Ziel:
Joker-Nutzung speichern (optional: limitiert nutzbar)

🛠 Umsetzung:
Aufgabe	ToDo
Supabase-Tabelle	joker_usage (user_id, joker_type, quiz_id, used_at)
Mutation	useJoker(type: string)
Validierung	Check: already used for this quiz?
🕹 5. Quiz-Sessions (optional – für PvP, Historie, Analyse)
🔄 Status:
Keine serverseitige Speicherung von Quiz-„Sitzungen“

📦 Ziel:
Nach jedem Quiz eine Session speichern (Fragen, XP, Zeit)

🛠 Umsetzung:
Aufgabe	ToDo
Supabase-Tabelle	quiz_sessions (user_id, chapter_id, started_at, ended_at, correct_count, xp_earned, used_jokers, etc.)
Mutation	completeQuizSession()
Verwendung	PvP-Matches, Fortschrittshistorie, Vergleich
📊 6. Leaderboard & Level-System (später)
Leaderboard kann auf Basis von xp_total (aus profiles) berechnet werden

Level = XP / 1000 (z. B.)

Später eigene Tabellen möglich: levels, ranking_snapshots

🧠 Empfohlene Reihenfolge zur Umsetzung
✅ addXP, addCoins → mit onMutate + Supabase Write

✅ unlockMedal → Medaillen-Tabelle + Vergaberegel

✅ trackProgress → Fortschritt je Kapitel synchronisieren

🟡 useJoker → Joker-Verbrauch pro Session protokollieren

🟡 completeQuizSession → später bei PvP / Ligamodus

🧰 Tools & Patterns
🧠 Mutationen: useMutation mit onMutate, onSuccess, onError

🧹 Cache-Invalidierung nach addXP → queryKeys.quiz.userStats(userId)

🔐 Absicherung: Nur eingeloggte Nutzer dürfen schreiben

✅ Zielbild
Nach Umsetzung dieses Plans ist dein System:

skalierbar für Wettbewerb & Multiplayer

fälschungssicher für Rankings & Belohnungen

modular für Shop, PvP, Achievements & Story-Modus