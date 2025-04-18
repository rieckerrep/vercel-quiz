XP-System:
Wie viel XP gibt es pro richtige Antwort?
Die XP gibt es entsprechend der Tabelle "question_types" und den dort definierten Fragetypen

Gibt es Bonus-XP für Streaks?
Nur wenn der Streak-Joker aktiviert ist

Gibt es Bonus-XP für schwierige Fragen?
Nein.

Liga-System:
Welche Ligen gibt es?
Die aus der Tabelle "leagues"

Wie funktioniert Aufstieg/Abstieg?
Die ersten 5 Steigen auf, die letzten 5 Steigen ab.
Es soll mehrere Ligagruppen geben, deren Zahl angepasst werden kann. Es geht quasi darum, dass die Spieler auf- und absteigen können, aber nicht alle Spieler auf einmal, sondern nur in bestimmten Gruppen.

Wie oft werden Ligen aktualisiert?
21 Tage

Streak-System:
Wie funktionieren die Boni?
Streaks sollen gezählt werden mit Flammen.

Wie werden Streaks berechnet?
Eine Frage beantwortet einmal am Tag.

Gibt es unterschiedliche Streak-Typen?
Tagesstrak - eine Frage am Tag beantwortet und gespielt.
Fragenstreak - Mehrere Fragen hintereinander richtig beantwortet.

Shop-System:
Welche Items gibt es?
Noch gibt es keine. Sie sollen aber in der "items" Tabelle definiert werden.

Was kosten sie?
Das ergibt sich aus der "items" Tabelle.

Was bewirken sie?
Das ergibt sich auch aus der "items" Tabelle oder etwaigen Subtabellen, die jedoch noch erstellt werden müssen.

Universitäts-System:
Wie werden Punkte berechnet?
Die XP aller Spieler die in einer Universität angehören.

Wie funktioniert die Rangliste?
Die Universitäten werden nach ihren Plätzen skaliert, die in diesem Monat verdient wurden. Am 1. eines Monats erfolgt der Reset.
Man soll die Uni anklicken können und sehen welcher Spieler wie viel beitragen hat.

Gibt es besondere Boni?
Noch nicht.

Medaillen-System:
Welche Medaillen gibt es?
Gold, Silber, Bronze

Wie werden sie vergeben?
Pro Kapitel die richtig beantworteten Fragen
100% = Gold
75% = Silber
50% = Bronze
Unter 50% = Keine Medaille

Was bewirken sie?
Erstmal nichts, sie dienen nur dem eigenen Erfolgstracking.

XP-System:
Wie genau funktioniert der Streak-Joker?
Den muss man anklicken und mit 50 Münzen kaufen.

Gibt es eine maximale Anzahl an XP pro Tag?
Nein.

Gibt es einen XP-Multiplikator für bestimmte Zeiten/Tage?
Dafür können wir ggf. eine Events-Tabelle schreiben? z.B. Strafrechtsevent, Zivilrechtsevent oder sowas?

Liga-System:
Wie viele Spieler sind pro Ligagruppe erlaubt?
In einer Liga (Holzliga, Bronzeliga, Silberliga...)
Es muss in jeder Liga ca. 20 Spieler geben zu einem Zeitpunkt - es muss immer darauf geachtet werden, dass die Gruppen so verteilt sind, sodass die Ligagrößen kompetetiv zueinander passen. Es kann zB 10 Holzligagruppen geben, aber nur 1 Champions League Gruppe.

Was passiert, wenn eine Liga-Gruppe zu klein wird?
Dann werden Gruppen zusammengeführt.

Gibt es eine Mindestanzahl an Spielern pro Liga?
Nein.

Wie werden neue Spieler eingestuft?
Holzliga

Streak-System:
Wie viele Flammen gibt es maximal?
Unendlich.

Was passiert, wenn ein Streak gebrochen wird?
Die Flammen werden auf 0 zurückgesetzt.

Gibt es Belohnungen für bestimmte Streak-Längen?
In Zukunft Achievements.

Wie wird der Tagesstreak genau berechnet? (24h oder Kalendertag?)
Kalendertag

Shop-System:
Sollen Items zeitlich begrenzt sein?
Kommt auf das Item an und muss ggf. in der Tabelle definiert werden

Können Items gestapelt werden?
Nur "verbrauchbare Items" auf Vorrat.

Gibt es limitierte Items?
Ersmtal nicht.

Wie funktioniert die Item-Verwendung?
Im PVP können Items den Schaden erhöhen und den Schaden abwehren, Zeitboni geben
Im Singleplayer können sie den Münzverlust minimieren oder den XP-Verdienst erhöhen.
Das muss sich aus der Tabelle ergeben.

Universitäts-System:
Wie werden neue Universitäten hinzugefügt?
Es gibt eine Tabelle "universities"

Können Spieler die Universität wechseln?
Ja, in ihren Profileinstellungen im Frontend.

Gibt es eine Mindestanzahl an Spielern pro Universität?
Nein.

Wie werden Universitäts-Rankings visualisiert?
Im Leaderboard.

Medaillen-System:
Können Medaillen verloren gehen?
Nein.

Gibt es eine Übersicht aller verdienten Medaillen?
Ja, in der eigenen Profilübersicht.

Können Medaillen mehrfach verdient werden?
Ja, klar.

Gibt es spezielle Medaillen für besondere Leistungen?
Nein.

Allgemeine Fragen:
Gibt es ein Tutorial für neue Spieler?
Ja, aber das entwickeln wir später.

Wie werden neue Fragen hinzugefügt?
In der Tabelle Questions und den dazugehörigen Subtabellen:
cases_subquestion
dragdrop_pairs
und ggf. noch weiteren Tabellen, die hinzukommen

Gibt es eine Moderation für Fragen?
Erstmal nicht.

Wie werden Fehler in Fragen behoben?
Im Frontend soll später eine rote Flagge eingebaut werden, mit der man Fragen melden kann.

Gibt es ein Belohnungssystem für das Melden von Fehlern?
Erstmal nicht.