# Datenbank-Übersicht RieckerRep Quiz

## Tabellenstruktur

### Lerninhalte
- `subjects` (Fächer)
  - `id` (bigint)
  - `name` (text)

- `courses` (Kurse)
  - `id` (bigint)
  - `subject_id` (bigint)
  - `name` (text)

- `chapters` (Kapitel)
  - `id` (bigint)
  - `course_id` (bigint)
  - `name` (text)

### Fragen & Antworten
- `questions`
  - `id` (bigint)
  - `chapter_id` (bigint)
  - `question` (text)
  - `option_a/b/c/d` (text)
  - `correct_answer` (text)
  - `explanation` (text)
  - `question_type_id` (uuid) - NOT NULL

- `question_types`
  - `id_uuid` (uuid) - Primary Key
  - `id` (text)
  - `base_xp` (integer)
  - `base_coins` (integer)
  - `is_bonus` (boolean)

### Spezielle Fragetypen
- `multiple_choice_options`
  - `id` (bigint)
  - `question_id` (bigint)
  - `option_text` (text)
  - `is_correct` (boolean)

- `dragdrop_groups/dragdrop_pairs`
  - Für Drag & Drop Fragen

- `cases_subquestions`
  - Für Fallbasierte Fragen

### Benutzer & Fortschritt
- `profiles`
  - `id` (uuid)
  - `username` (text)
  - `university` (text)

- `user_stats`
  - `user_id` (uuid)
  - `total_xp/coins` (bigint)
  - `level` (bigint)
  - `questions_answered` (bigint)
  - `correct_answers` (bigint)

- `quiz_progress`
  - `user_id` (uuid)
  - `chapter_id` (integer)
  - `progress` (integer)

### Gamification & Belohnungen
- `reward_types`
  - `id` (uuid)
  - `question_type` (text)
  - `reward_type` (text)
  - `base_xp` (integer)
  - `base_coins` (integer)
  - `xp_penalty` (integer)
  - `coin_penalty` (integer)

- `levels`
  - `id` (integer)
  - `level_number` (integer)
  - `xp_required` (bigint)
  - `level_image` (text)
  - `level_title` (text)

- `medals`
  - `id` (text)
  - `name` (text)
  - `description` (text)
  - `icon_url` (text)

- `user_medals`
  - `id` (uuid)
  - `user_id` (uuid)
  - `quiz_id` (uuid)
  - `medal` (text) - 'bronze', 'silver', 'gold'

### Streaks & Aktivität
- `daily_streaks`
  - `user_id` (uuid)
  - `current_streak` (integer)
  - `last_active_date` (date)

- `user_streaks`
  - `user_id` (uuid)
  - `current_streak` (integer)
  - `last_updated` (timestamp)

### PvP & Wettbewerb
- `pvp_matches`
  - `id` (uuid)
  - `status` (text) - 'pending', 'active', 'finished'
  - `mode` (text)
  - `created_at` (timestamp)

- `pvp_participants`
  - `id` (uuid)
  - `match_id` (uuid)
  - `user_id` (uuid)
  - `hp` (integer)
  - `score` (integer)
  - `finished` (boolean)

- `pvp_responses`
  - `id` (uuid)
  - `match_id` (uuid)
  - `user_id` (uuid)
  - `question_id` (bigint)
  - `is_correct` (boolean)
  - `damage_done` (integer)
  - `self_damage` (integer)

### Shop & Items
- `items`
  - `id` (uuid)
  - `name` (text)
  - `description` (text)
  - `price` (integer)
  - `type` (text) - 'joker', 'avatar', 'pvp_boost', 'cosmetic'
  - `icon_url` (text)

- `user_items`
  - `user_id` (uuid)
  - `item_id` (uuid)
  - `is_active` (boolean)
  - `quantity` (integer)
  - `acquired_at` (timestamp)

### Universitäten & Ligen
- `universities`
  - `id` (integer)
  - `name` (text)
  - `xp_total` (bigint)

- `monthly_uni_scores`
  - `id` (integer)
  - `university_id` (integer)
  - `xp_this_month` (integer)
  - `month_start` (date)
  - `month_end` (date)

- `leagues`
  - `id` (bigint)
  - `name` (text)
  - `league_img` (text)
  - `next_league` (text)
  - `previous_league` (text)

- `league_positions`
  - `user_id` (uuid)
  - `league_name` (text)
  - `points` (bigint)
  - `ranking` (integer)

### Dispute System (Streitfälle)
- `dispute_cases`
  - `id` (uuid)
  - `title` (text)
  - `description` (text)
  - `is_active` (boolean)
  - `chapter_id` (bigint)

- `dispute_views`
  - `id` (uuid)
  - `dispute_case_id` (uuid)
  - `view_name` (text)
  - `description` (text)
  - `exam_relevance` (text)
  - `exam_preference_order` (integer)
  - `order` (integer)

- `dispute_arguments`
  - `id` (uuid)
  - `dispute_view_id` (uuid)
  - `argument_text` (text)
  - `order` (integer)

- `dispute_questions`
  - `id` (uuid)
  - `dispute_case_id` (uuid)
  - `question_type` (text) - 'problem', 'view', 'detail', 'argument'
  - `question_text` (text)
  - `order` (integer)

- `dispute_answers`
  - `id` (uuid)
  - `user_id` (uuid)
  - `dispute_question_id` (uuid)
  - `answer_text` (text)

- `dispute_preferences`
  - `id` (uuid)
  - `dispute_case_id` (uuid)
  - `view_id` (uuid)
  - `preference_order` (integer)

### Sequenz-System
- `sequence_blocks`
  - `id` (uuid)
  - `title` (text)
  - `chapter_id` (bigint)

- `sequence_steps`
  - `id` (uuid)
  - `title` (text)
  - `level` (integer)
  - `position` (integer)
  - `block_id` (uuid)

- `case_sequence_steps`
  - `id` (uuid)
  - `dispute_case_id` (uuid)
  - `sequence_step_id` (uuid)
  - `correct_order` (integer)
  - `parent_id` (uuid)

### Benutzer & Rollen
- `user_roles`
  - `id` (uuid)
  - `user_id` (uuid)
  - `role` (text) - 'admin', 'user'
  - `created_at` (timestamp)
  - `updated_at` (timestamp)

### Versionierung
- `versions`
  - `id` (integer)
  - `table_name` (varchar)
  - `data` (jsonb)
  - `created_at` (timestamp)

### Antworten & Belohnungen
- `answered_questions`
  - `id` (bigint)
  - `user_id` (uuid)
  - `question_id` (bigint)
  - `is_correct` (boolean)
  - `answered_at` (timestamp)
  - `chapter_id` (integer)

- `answered_rewards`
  - `id` (uuid)
  - `user_id` (uuid)
  - `question_context_id` (uuid)
  - `reward_type_id` (uuid)
  - `xp_earned` (integer)
  - `coins_earned` (integer)
  - `created_at` (timestamp)

- `item_usage_log`
  - `id` (integer)
  - `user_id` (uuid)
  - `item_id` (integer)
  - `used_at` (timestamp)

### Match-Teilnehmer
- `match_participants`
  - `id` (uuid)
  - `match_id` (uuid)
  - `user_id` (uuid)
  - `joined_at` (timestamp)
  - `score` (integer)

### Shop & Avatare
- `shop_avatars`
  - `id` (integer)
  - `image_url` (text)
  - `price` (integer)
  - `active` (boolean)
  - `title` (text)
  - `category` (text)

- `user_avatars`
  - `user_id` (uuid)
  - `avatar_id` (bigint)
  - `created_at` (timestamp)

## RPC-Funktionen

### Fragen-Management
```sql
get_questions_by_chapter(chapter_id bigint)
```
- Gibt alle Fragen eines Kapitels zurück
- Inklusive Fragetyp, XP und Coins

### Fortschritt & Statistiken
```sql
update_quiz_progress(p_user_id uuid, p_chapter_id bigint, p_is_correct boolean)
```
- Aktualisiert Benutzerfortschritt
- Berechnet XP und Coins
- Aktualisiert Statistiken

### Level & Belohnungen
```sql
calculate_level_and_rewards(p_user_id uuid)
```
- Berechnet aktuelles Level
- Zeigt XP bis zum nächsten Level
- Gibt aktuelle Coins zurück

### Fragenvalidierung
```sql
validate_answer(p_question_id bigint, p_user_answer text)
```
- Validiert Benutzerantwort
- Gibt Erklärung zurück
- Berechnet Belohnungen

### PvP & Wettbewerb
```sql
create_pvp_match(mode text, user_id uuid)
```
- Erstellt einen neuen PvP-Match
- Fügt den Ersteller als Teilnehmer hinzu

```sql
join_pvp_match(match_id uuid, user_id uuid)
```
- Fügt einen Spieler zu einem PvP-Match hinzu
- Initialisiert HP und Score

```sql
submit_pvp_answer(match_id uuid, user_id uuid, question_id bigint, answer text)
```
- Verarbeitet eine PvP-Antwort
- Berechnet Schaden und Updates Scores

### Streaks & Aktivität
```sql
update_daily_streak(user_id uuid)
```
- Aktualisiert den täglichen Streak
- Berechnet Belohnungen

```sql
check_streak_rewards(user_id uuid)
```
- Prüft auf Streak-Belohnungen
- Vergibt XP und Coins

### Dispute System
```sql
create_dispute_case(title text, description text, chapter_id bigint)
```
- Erstellt einen neuen Streitfall
- Initialisiert die Standard-Views

```sql
submit_dispute_answer(dispute_question_id uuid, user_id uuid, answer_text text)
```
- Speichert eine Antwort auf eine Streitfall-Frage
- Aktualisiert die Präferenzen

```sql
validate_dispute_sequence(dispute_case_id uuid, sequence uuid[])
```
- Validiert die Reihenfolge der Argumente
- Berechnet die Punktzahl

### Sequenz-System
```sql
create_sequence_block(title text, chapter_id bigint)
```
- Erstellt einen neuen Sequenz-Block
- Initialisiert die Standard-Schritte

```sql
update_sequence_order(block_id uuid, new_order uuid[])
```
- Aktualisiert die Reihenfolge der Schritte
- Validiert die Konsistenz

### Strafen & Belohnungen
```sql
apply_penalty_for_wrong_answers(user_id uuid, question_id bigint)
```
- Wendet Strafen für falsche Antworten an
- Reduziert XP und Coins
- Aktualisiert Statistiken

### Shop & Avatare
```sql
purchase_avatar(user_id uuid, avatar_id integer)
```
- Prüft ausreichend Coins
- Fügt Avatar zum Benutzer hinzu
- Zieht Coins ab

```sql
equip_avatar(user_id uuid, avatar_id integer)
```
- Setzt Avatar als aktiv
- Aktualisiert Profil

## Trigger-Funktionen

```sql
CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"()
```
- Automatische Aktualisierung von `updated_at` Timestamps
- Wird für folgende Tabellen verwendet:
  - `case_sequence_steps`
  - `sequence_steps`
  - `user_roles`

## Row Level Security (RLS) Policies

### Admin Policies
```sql
"Only admins can manage questions"
"Only admins can manage reward types"
"Only admins can manage roles"
"Only admins can manage sequence steps"
"Only admins can manage views"
```

### Benutzer-spezifische Policies
```sql
"Enable read access for all users"
"Enable update for users based on email"
"User can update own profile"
"User can view their own avatars"
"Users can view their own rewards"
```

### Öffentliche Policies
```sql
"Public read access to items"
"Public read access to league_positions"
"Public read access to monthly_uni_scores"
"Public read access to shop_avatars"
"Public read access to universities"
```

### Antworten & Belohnungen Policies
```sql
"Enable insert for authenticated users only" - answered_questions
"Enable read access for all users" - answered_questions
"Enable update for users based on email" - answered_questions
"Only system can insert rewards" - answered_rewards
"Users can view their own rewards" - answered_rewards
"select_own_items" - item_usage_log
```

### Match Policies
```sql
"own_participation" - match_participants
"see_own_participation" - match_participants
```

### Avatar Policies
```sql
"User can insert their own avatars"
"User can update their own avatars"
"User can delete their own avatars"
"User can view their own avatars"
"Public read access to shop_avatars"
```

### PvP Policies
```sql
"see_own_matches" - pvp_matches
"see_own_pvp_answers" - pvp_answers
"own_responses" - pvp_responses
"own_participation" - match_participants
"see_own_participation" - match_participants
"insert_own_pvp_answers" - pvp_answers
```

## Berechtigungen (Grants)

### Schema Berechtigungen
```sql
GRANT USAGE ON SCHEMA "public" TO:
- postgres
- anon
- authenticated
- service_role
```

### Tabellen Berechtigungen
```sql
GRANT ALL ON TABLES TO:
- anon
- authenticated
- service_role
```

### Sequenz Berechtigungen
```sql
GRANT ALL ON SEQUENCES TO:
- anon
- authenticated
- service_role
```

## Zusätzliche Constraints

### User Stats Constraints
```sql
CONSTRAINT "positive_coins" CHECK (total_coins >= 0)
CONSTRAINT "positive_xp" CHECK (total_xp >= 0)
CONSTRAINT "valid_level" CHECK (level > 0)
```

### Unique Constraints
```sql
UNIQUE (user_id, league_name) - league_positions
UNIQUE (user_id, chapter_id) - quiz_progress
UNIQUE (user_id, quiz_id) - user_medals
UNIQUE (user_id, role) - user_roles
```

### Foreign Key Constraints
```sql
FOREIGN KEY (user_id) REFERENCES auth.users(id)
FOREIGN KEY (chapter_id) REFERENCES chapters(id)
FOREIGN KEY (course_id) REFERENCES courses(id)
```

### Shop & Avatar Constraints
```sql
CONSTRAINT "shop_avatars_pkey" PRIMARY KEY (id)
CONSTRAINT "user_avatars_pkey" PRIMARY KEY (user_id, avatar_id)
CONSTRAINT "user_avatars_avatar_id_fkey" FOREIGN KEY (avatar_id) REFERENCES shop_avatars(id)
CONSTRAINT "user_avatars_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id)
```

### PvP Constraints
```sql
CONSTRAINT "pvp_matches_status_check" CHECK (status IN ('pending', 'active', 'finished'))
CONSTRAINT "pvp_answers_match_id_user_id_question_id_key" UNIQUE (match_id, user_id, question_id)
CONSTRAINT "pvp_responses_match_id_user_id_question_id_key" UNIQUE (match_id, user_id, question_id)
CONSTRAINT "match_participants_match_id_user_id_key" UNIQUE (match_id, user_id)
```

## Performance-Optimierungen

1. Indizierte Spalten:
   - `questions.chapter_id`
   - `user_stats.user_id`
   - `quiz_progress.user_id`
   - `quiz_progress.chapter_id`

2. Optimierte Joins zwischen:
   - Fragen und Fragetypen
   - Benutzer und Statistiken
   - Kapitel und Fortschritt

3. Zusätzliche Indizes:
   - `pvp_matches.status`
   - `pvp_participants.match_id`
   - `pvp_responses.match_id`
   - `user_items.user_id`
   - `league_positions.league_name`

4. Optimierte Joins für:
   - PvP-Matches und Teilnehmer
   - Universitäten und Monatsscores
   - Ligen und Positionen

5. Dispute System Indizes:
   - `dispute_cases.chapter_id`
   - `dispute_views.dispute_case_id`
   - `dispute_arguments.dispute_view_id`
   - `dispute_questions.dispute_case_id`
   - `dispute_answers.user_id`
   - `dispute_answers.dispute_question_id`

6. Sequenz-System Indizes:
   - `sequence_blocks.chapter_id`
   - `sequence_steps.block_id`
   - `sequence_steps.position`
   - `case_sequence_steps.dispute_case_id`
   - `case_sequence_steps.sequence_step_id`

7. Optimierte Joins für:
   - Streitfälle und Views
   - Sequenz-Blöcke und Schritte
   - Benutzer und Rollen

8. RLS Performance:
   - Policies sind für schnelle Zugriffsprüfungen optimiert
   - Indizes unterstützen die Policy-Bedingungen
   - Caching von Policy-Ergebnissen

9. Trigger Performance:
   - Minimale Trigger-Ausführungszeit
   - Effiziente Timestamp-Updates
   - Batch-fähige Operationen

10. Antworten & Belohnungen Indizes:
    - `answered_questions.user_id`
    - `answered_questions.question_id`
    - `answered_rewards.user_id`
    - `answered_rewards.question_context_id`
    - `item_usage_log.user_id`

11. Match Indizes:
    - `match_participants.match_id`
    - `match_participants.user_id`

12. Optimierte Joins für:
    - Antworten und Belohnungen
    - Match-Teilnehmer und Scores
    - Item-Nutzung und Logs

13. Shop & Avatar Indizes:
    - `shop_avatars.active`
    - `shop_avatars.category`
    - `user_avatars.user_id`
    - `user_avatars.avatar_id`

14. Optimierte Joins für:
    - Shop-Avatare und Benutzer-Avatare
    - Avatare und Profile

15. PvP-spezifische Indizes:
    - `pvp_answers.match_id`
    - `pvp_answers.user_id`
    - `pvp_answers.question_id`
    - `pvp_responses.match_id`
    - `pvp_responses.user_id`
    - `pvp_responses.question_id`
    - `match_participants.match_id`
    - `match_participants.user_id`

16. Optimierte Joins für:
    - PvP-Matches und Antworten
    - PvP-Matches und Teilnehmer
    - PvP-Matches und Statistiken 