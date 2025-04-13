Super! Hier ist dein vollständiger, strukturierter Migrationplan für dein Quizsystem – von einem frontend-zentrierten Modell zu einem sauberen, backend-gesteuerten Supabase-System mit XP-Logik, Item-Verwaltung und Fortschrittstracking:

🛠️ Migrationplan: Frontend → Supabase Backend
📌 Ziel
Verlagerung der XP-, Coins-, Fortschritts- und Item-Logik ins Supabase-Backend zur Sicherheit, Nachvollziehbarkeit und langfristigen Skalierbarkeit.

✅ 1. Was aktuell im Frontend geregelt wird
Logikbereich	Beschreibung
XP-Vergabe	XP werden im Frontend berechnet und gesetzt
Münzenvergabe	Analog zur XP-Logik
Fortschritt	Zustand wird lokal gespeichert
Items/Joker	Verwendung und Verbrauch rein im Zustand
Medaillen/Achievements	Vermutlich lokal oder gar nicht gespeichert
Streak	Berechnung im Zustand
📦 2. Zielstruktur in Supabase (Tabellen + Logik)
🗃️ Tabellen
Tabelle	Zweck
answered_questions	Speichert alle beantworteten Fragen (1:1)
xp_log	XP-Vergabe pro Ereignis (Frage, Bonus, etc.)
user_progress	Fortschritt pro Kapitel, Kurs, Kategorie
user_items	Besitz, Verbrauch und Aktivierung von Items
medal_unlocks	Verliehene Medaillen inkl. Zeitstempel
⚙️ 3. RPC-Funktionen (PostgreSQL Functions)
🧠 submit_answer(user_id, question_id, is_correct)
Prüft, ob bereits beantwortet → wenn nicht:

trägt answered_questions ein

vergibt XP und Coins via insert into xp_log

prüft Streak-Status

gibt Belohnung als JSON zurück

json
Kopieren
Bearbeiten
{
  "xp": 10,
  "coins": 5,
  "streakBonus": true,
  "itemReward": "joker_5050",
  "medalUnlocked": "civil_code_master"
}
🧠 use_item(user_id, item_id)
Reduziert quantity oder deaktiviert dauerhaftes Item

Gibt Info zurück: success, remaining

🧠 award_xp(user_id, amount, source)
Kann für Spezialbelohnungen, Daily Bonus etc. genutzt werden

Trägt in xp_log ein

🔗 4. Frontend-Anpassung (nach der Migration)
🔁 Vorher:
ts
Kopieren
Bearbeiten
addXPMutation.mutate({ userId, amount: 10 });
✅ Nachher:
ts
Kopieren
Bearbeiten
submitAnswerMutation.mutate({
  userId,
  questionId,
  isCorrect,
});
→ Antwort enthält Belohnung, Coins, Items → diese werden nur angezeigt, nicht mehr berechnet.

🧭 5. Migrationsstrategie: Schrittweise Einführung
Phase	Was passiert
Phase 1: Logging aktivieren	Nur answered_questions schreiben, sonst alles wie bisher
Phase 2: XP/Coins ins Backend	submit_answer() aktiv, Frontend ersetzt eigene XP-Logik
Phase 3: Items & Medaillen umziehen	Verbrauch, Besitz und Belohnung über Backend
Phase 4: Progress synchronisieren	user_progress wird aus RPC gepflegt
Phase 5: Leaderboard & Statistik auf Backend umstellen	
🧰 ToDo-Liste für Umsetzung
 Tabellen in Supabase anlegen (answered_questions, xp_log, ...)

 RPC submit_answer() schreiben

 Frontend: useSubmitAnswerMutation() einführen

 Bestehende XP- & Coins-Logik ersetzen

 Item-Verbrauch über use_item() RPC realisieren

 useQuizRewards umstellen auf serverseitige Infos

 Tests: XP & Coins & Items nur über RPC testen

 Langfristig: Medaillen & Statistiksystem auf Supabase synchronisieren

💬 Optional: Erweiterungsideen
🔒 Middleware-Auth für Token-Schutz bei Supabase-Calls

🧪 Testdaten mit einem Seed-Script

🧰 Edge Functions für komplexere Logik (Daily XP, Challenges)

Wenn du willst, baue ich dir jetzt:

✅ submit_answer.sql (fertige Supabase RPC)

✅ Neue useSubmitAnswerMutation.ts im React-Code

✅ Deine Datenbankstruktur als schema.sql Export (ready für Git-Backup)

Sag einfach:
„Mach mir die RPC und Mutation jetzt als Code“ – und ich setze den Plan direkt mit dir um.