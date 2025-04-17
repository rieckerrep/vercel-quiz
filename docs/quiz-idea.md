🎓 Wie dein Quiz funktionieren soll (aus meiner Sicht)
📦 Allgemeines Prinzip
Nutzer bekommen bei Wix ein bestimmtes Quiz passend zu einem Kapitel, welches über iFrame in Wix eingebettet wird. Das Kapitel passt inhaltlich zu dem jeweiligen Videokurs.

Die Anmeldung soll so funktionieren, dass man nahtlos den Wix-Account nutzen kann, um sich in dem Quiz anzumelden. Man soll aber danach noch seine Universität + seinen Benutzernamen wählen sollen. In Zukunft soll es eine eigene LMS-Lernumgebung werden wie kurse.rieckerrep.de von der aus man dann von der Landing Page weitergeleitet wird. In dieser Kurs-Umgebung gibt es dann Videokurse, Quiz und etc. (erst in Zukunft noch nicht)

Sie beantworten eine Reihe von Fragen mit verschiedenen Fragetypen (Question (eine richtige Antwort), Open Question, Lückentext (exakte Antwort), Multiple Choice, Drag & Drop, Dispute, Sequence etc.)

Für richtige Antworten bekommen sie:

XP (Erfahrungspunkte) → relevant für Liga, Uni-Leaderboard, Spieler-Leaderboard und Levelaufstieg

Coins/Münzen → Avatar-Shop oder Item-Nutzung (Joker, später Items für PVP)

Medaillien für % die richtig sind (50% richtig für Bronze, 75% für Silber, 100% für Gold)

Es gibt Joker, z. B. 50:50 (nur für normale Question), doppelte XP, Hinweis, Streak-XP

Das Quiz läuft im Frontend, aber alle wichtigen Logiken sollen langfristig ins Supabase-Backend

🧠 Fragetypen
Question (eine richtige Antwort), Open Question, Lückentext (exakte Antwort), Multiple Choice, Drag & Drop, Dispute, Sequence (Juristische Schema)

➡ Fragetypen sind modular aufgebaut, über question_type steuerbar
➡ Die XP werden entsprechend der Tabelle im Backend vergeben
➡ Alle Fragen sind dynamisch aus der Datenbank geladen (kein Hardcoding)

🧮 Punkte- & XP-System
XP pro richtiger Antwort (+10)

Coins zusätzlich (+10)

Coin-Verlust bei falscher Antwort (-5)

Aber: nur einmal pro Frage → Anti-Farming muss greifen 

Level steigt bei XP-Marke (z. B. 1000 XP → Level 2), Tabelle "levels"

Profil-Anzeige
- Zugriff auf sein Profil mit Profilbild, Name, Uni, Liga, Gesamt-XP, Münzen und individuellen Statistiken

⚔️ PvP-System (in Zukunft)
Nutzer können gegen andere Nutzer spielen

# 📚 RieckerRep PvP-System (Entwurf)

## Grundidee
Juristisches 1vs1-Quizduell mit Lebenspunkten (HP) und Items. Jede richtige Antwort verursacht Schaden beim Gegner, jede falsche Antwort kostet eigene HP. Taktische Items beeinflussen den Spielverlauf.

## Spielmechanik
- Start: Beide Spieler starten mit **100 HP**.
- Pro Frage:
  - ✅ Richtige Antwort: Gegner verliert z. B. **-20 HP**
  - ❌ Falsche Antwort: Selbstverlust von z. B. **-10 HP**
  - ⏱️ Langsames Antworten = weniger Schaden
- Match endet bei **0 HP** oder nach allen Fragen → Sieger = Spieler mit mehr HP.

## PvP-Modi (geplant)
- **Blitzduell**: 5 schnelle Fragen, ohne Items
- **Standardduell**: 10 Fragen, Items erlaubt
- **Ligaduelle**: regelmäßig, mit Ranking & Belohnungen

Gegner-Varianten
 Modi 1vs1 (gleiche Uni)
- Uni-Duell (1vs1)
- Gruppen-Duell


## Items (Beispiele) - in Zukunft, jetzt nicht umsetzen
- 🛡️ `§-Schild`: blockt einmaligen Schaden  
- ⚡ `Jura-Boost`: doppelter Schaden bei nächster richtigen Antwort  
- 🧠 `Rechtsmittel`: ignoriert eine falsche Antwort  
- ⏳ `Zeit-Stopp`: Gegner verliert Zeit bei nächster Frage  

## Belohnungssystem
- XP & Coins je nach Ausgang (Sieg, Unentschieden, Niederlage)
- PvP-spezifische Medaillen (z. B. „5 Duelle in Folge gewonnen“)
- Statistikführung (Siege, Streaks, Schaden, Antwortquote)

## Technisches Setup (Kurzüberblick)
- **Frontend**: React-Komponenten für Lobby, Match, Ergebnis
- **Backend**: Supabase mit Tabellen für `matches`, `responses`, `items`, `inventory`
- **Ziel**: Erst **asynchron**, später optional **Live-PvP**

---

🧠 Fokus: Didaktik trifft Gamification – Jura wird zur spannenden Lernarena.


Möglichkeit über den Singleplayer hinaus XP zu verdienen
University-Leaderboard (Multiplayer)

🛍 Items & Joker
Nutzer können mit Coins Items kaufen

Einsatz von Items verändert Quizverlauf:

50:50 entfernt 2 falsche Antworten

Streak löst bei 3 richtig hintereinander beantworteten Fragen einen Bonus-XP aus (+30)

XP-Bonus gibt doppelte XP für die nächste Frage

Hint gibt einen Hinweis

📊 Am Ende des Quiz (Endscreen)
get_quiz_summary() zeigt:

Richtige/Falsche Anzahl

XP + Coins

Verdiente Medaillen


Das Quiz wird abgeschlossen, wenn alle Fragen beantwortet sind

Fragen könenn erneut beantwortet werden (werden aber in der QuizNavigation grau angezeigt, wenn die Fragen noch nicht beantwortet wurden)

Die Items werden im Backend gespeichert und im Frontend angezeigt und ausgelöst



Bereich	Beschreibung	Vorschlag/Funktion
🎯 Antwort einreichen	Frage beantworten, XP/Coins erhalten, Eintrag speichern	submit_answer()
🧠 Levelsystem	XP-Marken für Levelaufstieg, z. B. Level 2 ab 1000 XP	update_level_on_xp_change()
🧾 Medaillen-Check	Wird nach get_quiz_summary oder am Ende aufgerufen	ist schon über assign_medals_on_completion() geregelt
🧮 Statistiken	Trefferquote, Fortschritt, ggf. für Profil	get_user_stats() (optional)

ToDo:
- GetQuizSummary muss noch ergänzt werden bei Dispute / Sequence
- CalCulate and Award Xp muss noch ergänzt werden bei Dispute / Sequence