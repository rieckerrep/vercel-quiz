# RieckerRep Quiz API Dokumentation

## Übersicht
Diese Dokumentation beschreibt die verfügbaren Supabase-Funktionen für das RieckerRep Quiz-System. Alle Funktionen sind über die Supabase Edge Functions aufrufbar.

## Authentifizierung
Alle API-Aufrufe erfordern eine gültige JWT-Authentifizierung. Der Token muss im Authorization-Header mitgesendet werden.

## Quiz-Funktionen

### Fragen und Antworten

#### `get_question_detail`
- **Beschreibung**: Ruft detaillierte Informationen zu einer spezifischen Frage ab
- **Parameter**:
  - `p_question_id` (bigint): ID der Frage
- **Rückgabewert**: JSON-Objekt mit Frage-Details
- **Beispiel**:
```sql
SELECT * FROM get_question_detail(123);
```

#### `submit_answer`
- **Beschreibung**: Reicht eine Antwort ein und verarbeitet sie
- **Parameter**:
  - `p_user_id` (uuid): ID des Benutzers
  - `p_question_id` (bigint): ID der Frage
  - `p_answer_data` (jsonb): Antwortdaten
  - `p_used_items` (jsonb, optional): Verwendete Items
- **Rückgabewert**: JSON-Objekt mit Ergebnis
- **Beispiel**:
```sql
SELECT * FROM submit_answer(
  'user-uuid',
  123,
  '{"selected_option": "A"}'
);
```

### Fortschritt und Ranglisten

#### `get_quiz_progress`
- **Beschreibung**: Ruft den Quiz-Fortschritt eines Benutzers ab
- **Parameter**:
  - `p_user_id` (uuid): ID des Benutzers
- **Rückgabewert**: JSON-Objekt mit Fortschrittsdaten

#### `get_global_leaderboard`
- **Beschreibung**: Ruft die globale Rangliste ab
- **Parameter**: Keine
- **Rückgabewert**: JSON-Array mit Ranglisteneinträgen

#### `get_league_leaderboard`
- **Beschreibung**: Ruft die Liga-Rangliste ab
- **Parameter**:
  - `p_league_id` (uuid): ID der Liga
- **Rückgabewert**: JSON-Array mit Ranglisteneinträgen

### Belohnungssystem

#### `check_and_reward_answer`
- **Beschreibung**: Prüft und vergibt Belohnungen für Antworten
- **Parameter**:
  - `p_user_id` (uuid): ID des Benutzers
  - `p_context_id` (uuid): Kontext-ID
  - `p_question_type` (text): Fragentyp
  - `p_is_correct` (boolean): Korrektheit der Antwort
- **Rückgabewert**: JSON-Objekt mit Belohnungsdaten

#### `award_medal_if_eligible`
- **Beschreibung**: Vergibt Medaillen basierend auf Leistung
- **Parameter**:
  - `p_user_id` (uuid): ID des Benutzers
  - `p_medal_type` (text): Medaillentyp
- **Rückgabewert**: JSON-Objekt mit Medaillenstatus

### Shop-System

#### `get_shop_items`
- **Beschreibung**: Ruft verfügbare Shop-Items ab
- **Parameter**: Keine
- **Rückgabewert**: JSON-Array mit Shop-Items

#### `purchase_item`
- **Beschreibung**: Kauft ein Item im Shop
- **Parameter**:
  - `p_user_id` (uuid): ID des Benutzers
  - `p_item_id` (uuid): ID des Items
- **Rückgabewert**: JSON-Objekt mit Kaufstatus

#### `use_item`
- **Beschreibung**: Verwendet ein gekauftes Item
- **Parameter**:
  - `p_user_id` (uuid): ID des Benutzers
  - `p_item_id` (uuid): ID des Items
- **Rückgabewert**: JSON-Objekt mit Verwendungsstatus

### Benutzerprofil

#### `get_user_profile`
- **Beschreibung**: Ruft Benutzerprofilinformationen ab
- **Parameter**:
  - `p_user_id` (uuid): ID des Benutzers
- **Rückgabewert**: JSON-Objekt mit Profildaten

#### `update_avatar`
- **Beschreibung**: Aktualisiert den Benutzeravatar
- **Parameter**:
  - `p_user_id` (uuid): ID des Benutzers
  - `p_avatar_url` (text): URL des neuen Avatars
- **Rückgabewert**: JSON-Objekt mit Aktualisierungsstatus

### Universitätsfunktionen

#### `get_university_ranking`
- **Beschreibung**: Ruft das Universitätsranking ab
- **Parameter**: Keine
- **Rückgabewert**: JSON-Array mit Universitätsrankings

#### `get_university_contributors`
- **Beschreibung**: Ruft die Top-Beiträger einer Universität ab
- **Parameter**:
  - `p_university_id` (uuid): ID der Universität
- **Rückgabewert**: JSON-Array mit Beitragenden

## Fehlerbehandlung

Alle Funktionen geben im Fehlerfall ein JSON-Objekt mit folgender Struktur zurück:
```json
{
  "error": true,
  "message": "Fehlermeldung",
  "code": "FEHLERCODE"
}
```

## Rate Limiting

- Maximal 100 Anfragen pro Minute pro Benutzer
- Maximal 1000 Anfragen pro Stunde pro IP-Adresse

## Best Practices

1. **Caching**: Implementieren Sie Caching auf Client-Seite für häufig abgerufene Daten
2. **Fehlerbehandlung**: Implementieren Sie robuste Fehlerbehandlung
3. **Validierung**: Validieren Sie alle Eingabedaten vor dem API-Aufruf
4. **Sicherheit**: Speichern Sie keine sensiblen Daten im Client
5. **Performance**: Minimieren Sie die Anzahl der API-Aufrufe durch Batching

## Support

Bei Fragen oder Problemen kontaktieren Sie bitte den Support unter support@rieckerrep.de 