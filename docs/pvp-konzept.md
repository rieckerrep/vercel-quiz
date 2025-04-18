nur um klarheit in den gedanken von pvp reinzubringen. es sollen immer 3 fragen aus einer kategorie rausgegeben werden. die kategorien entsprechen den kursen ("courses"), dann sollen wieder die nächsten kategorien angezeigt werden.

PVP-Ablauf aus Sicht des Nutzers:

I. Match starten
Der Nutzer kann mehrere Matches starten:
1. 1vs.1 duelle

a. 1vs1 gegen einen anderen random spieler, der ebenfalls sucht (Quizduell-Style)
b. 1vs1 gegen einen Spieler einer anderen Uni

2. Gruppen-Duell: 

3vs3 gegen einen Spieler einer anderen Gruppe.
 -> Dafür müssen noch Gruppen innerhalb der Universitäten möglich sein (AG Strafrecht, Lerngruppe)

In der Zeit wird eine Anfrage rausgeschickt und muss mit jemandem gematched werden, der die gleiche Anfrage gestellt werden.
Im Frontend müssen die entsprechenden Animationen gebaut werden.

II. Match beginnt
1. 1vs1
Jeder Spieler startet standardmäßig mit 100 HP (können jedoch erhöht werden mit Items)

2. 3vs3
Bei 3vs3 entsprechend 300 HP (+Items der Spieler)

III. Laden der Questions
Die Kategorien entsprechen den Kursen aus der Tabelle "courses". Die Questions sind ausschließlich die mit dem Question_Type "questions" / "true_false" - die anderen Fragetypen werden bei PVP nicht berücksichtigt.

IV. Fragenwahl
1. 1 vs.1
Es werden 4 random Kategorien ("courses") angezeigt, die jeweils abwechselnd ausgesucht werden können (erst Spieler A, dann Spieler).

2. 3vs3
bei 3vs3 (ein random bestimmter Spieler aus Team A, dann ein random bestimmter Spieler aus Team B sucht die Kategorie aus). Alle bekommen 3 unterschiedliche Fragen derselben Kategorie.

V. Zeit
1. 1vs.1:
Hierfür hat der Nutzer jeweils immer 48 Stunden Zeit bis das Quiz abläuft und er eine Münz-Strafe bekommt. Nach 24 Stunden bekommt er einen Reminder.

2. 3vs3:
Hier müssen alle Nutzer innerhalb von 24 Stunden spielen, sonst bekommen sie alle eine Münz-Strafe.

VI. Folge einer Frage

1. 1 vs.1
Das Leben entspricht 100 HP (+ Items der Spieler)
Eine richtig beantwortete Frage fügt dem anderen standardmäßig 10 HP Schaden zu (+ eigene Items - Verteidigung des anderen)

Eine falsch beantwortete Frage fügt einem selbst standardmäßig 5 HP Schaden zu (- eigene Items + eigene Verteidigung)

2. 3vs3

Das Team-Leben entspricht 300 HP (+ Items jedes Spielers).
Eine richtig beantwortete Frage fügt dem anderen Team standardmäßig 10 HP Schaden zu (+ eigene Items zusammen - Verteidigung der anderen zusammen).

Eine falsch beantwortete Frage fügt einem selbst standardmäßig 5 HP Schaden zu (- eigene Items zusammen + eigene Verteidigung zusammen). 

Die Berechnung erfolgt wie folgt pro Runde:
Team-HP: Aktuelles Teamleben - (- eigener Schaden durch falsch beantwortete Fragen + Verteidigungsitems) - (-fremder Schaden durch anderes Team + AngriffsItems des anderen Teams).

VII. Ende
1. 1vs1
Das Quiz endet wenn einer weniger als 0 Leben hat.

2. 3vs3
Das Quiz endet wenn das Team weniger als 0 Leben hat.

VIII. Belohnungen
1. 1vs1
Die Differenz wird als XP vergeben. 

2. 3vs3
Die Team-Differenz wird an jeden Spieler als XP vergeben.
