


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."apply_penalty_for_wrong_answers"("p_user_id" "uuid", "p_wrong_question_ids" bigint[]) RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_new_wrong_ids BIGINT[];
  v_total_coin_loss INTEGER := 0;
BEGIN
  -- Neue, falsche Antworten identifizieren (Anti-Farming)
  SELECT ARRAY_AGG(q.id)
  INTO v_new_wrong_ids
  FROM questions q
  WHERE q.id = ANY(p_wrong_question_ids)
    AND NOT EXISTS (
      SELECT 1 FROM answered_questions aq
      WHERE aq.user_id = p_user_id AND aq.question_id = q.id
    );

  -- Gesamtverlust berechnen
  IF v_new_wrong_ids IS NOT NULL THEN
    SELECT COALESCE(SUM(qt.base_lose_coins), 0)
    INTO v_total_coin_loss
    FROM questions q
    JOIN question_types qt ON q.question_type_id = qt.id
    WHERE q.id = ANY(v_new_wrong_ids)
      AND qt.base_lose_coins > 0;

    -- Als falsch gespeichert
    INSERT INTO answered_questions (user_id, question_id, is_correct, answered_at)
    SELECT p_user_id, unnest(v_new_wrong_ids), FALSE, NOW();

    -- Coins abziehen
    UPDATE user_stats
    SET total_coins = GREATEST(total_coins - v_total_coin_loss, 0)
    WHERE user_id = p_user_id;
  END IF;

  RETURN '🚫 ' || COALESCE(v_total_coin_loss, 0) || ' Coins abgezogen für falsche Antworten.';
END;
$$;


ALTER FUNCTION "public"."apply_penalty_for_wrong_answers"("p_user_id" "uuid", "p_wrong_question_ids" bigint[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."assign_medals_on_completion"("p_user_id" "uuid", "p_chapter_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_total_questions INTEGER;
  v_correct_answers INTEGER;
  v_percentage NUMERIC;
  v_medal TEXT;
BEGIN
  -- Gesamtzahl der Fragen in Kapitel
  SELECT COUNT(*) INTO v_total_questions
  FROM questions
  WHERE chapter_id = p_chapter_id;

  -- Anzahl richtiger Antworten des Nutzers in diesem Kapitel
  SELECT COUNT(*) INTO v_correct_answers
  FROM answered_questions aq
  JOIN questions q ON aq.question_id = q.id
  WHERE q.chapter_id = p_chapter_id
    AND aq.user_id = p_user_id
    AND aq.is_correct = TRUE;

  IF v_total_questions = 0 THEN
    RETURN '🚫 Keine Fragen in diesem Kapitel.';
  END IF;

  v_percentage := (v_correct_answers * 100.0) / v_total_questions;

  -- Medaille bestimmen
  IF v_percentage >= 100 THEN
    v_medal := 'gold';
  ELSIF v_percentage >= 75 THEN
    v_medal := 'silver';
  ELSIF v_percentage >= 50 THEN
    v_medal := 'bronze';
  ELSE
    RETURN '❌ Keine Medaille vergeben.';
  END IF;

  -- Nur eintragen, wenn noch nicht vorhanden oder niedrigerwertig
  INSERT INTO user_medals (user_id, chapter_id, medal)
  VALUES (p_user_id, p_chapter_id, v_medal)
  ON CONFLICT (user_id, chapter_id) DO UPDATE
  SET medal = CASE
    WHEN EXCLUDED.medal = 'gold' THEN 'gold'
    WHEN EXCLUDED.medal = 'silver' AND user_medals.medal = 'bronze' THEN 'silver'
    WHEN EXCLUDED.medal = 'bronze' AND user_medals.medal IS NULL THEN 'bronze'
    ELSE user_medals.medal
  END;

  RETURN '✅ Medaille vergeben: ' || v_medal;
END;
$$;


ALTER FUNCTION "public"."assign_medals_on_completion"("p_user_id" "uuid", "p_chapter_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_and_award_xp"("question_ids" integer[], "subquestion_ids" integer[], "user_id_param" "uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  total_xp INTEGER := 0;
  question_xp INTEGER;
  subquestion_xp INTEGER;
BEGIN
  -- Berechne XP für korrekte Fragen
  IF question_ids IS NOT NULL AND array_length(question_ids, 1) > 0 THEN
    SELECT COALESCE(SUM(xp_value), 0) INTO question_xp
    FROM questions
    WHERE id = ANY(question_ids);
    
    total_xp := total_xp + question_xp;
  END IF;

  -- Berechne XP für korrekte Unterfragen
  IF subquestion_ids IS NOT NULL AND array_length(subquestion_ids, 1) > 0 THEN
    SELECT COALESCE(SUM(xp_value), 0) INTO subquestion_xp
    FROM cases_subquestions
    WHERE id = ANY(subquestion_ids);
    
    total_xp := total_xp + subquestion_xp;
  END IF;

  -- Aktualisiere die XP des Benutzers
  UPDATE user_stats
  SET total_xp = total_xp + COALESCE(total_xp, 0)
  WHERE user_id = user_id_param;

  RETURN total_xp;
END;
$$;


ALTER FUNCTION "public"."calculate_and_award_xp"("question_ids" integer[], "subquestion_ids" integer[], "user_id_param" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_and_award_xp"("user_id_param" "uuid", "question_ids" integer[], "subquestion_ids" integer[]) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  total_xp INTEGER := 0;
  question_xp INTEGER;
  subquestion_xp INTEGER;
BEGIN
  -- Berechne XP für korrekte Fragen
  IF question_ids IS NOT NULL AND array_length(question_ids, 1) > 0 THEN
    SELECT COALESCE(SUM(xp_value), 0) INTO question_xp
    FROM questions
    WHERE id = ANY(question_ids);
    
    total_xp := total_xp + question_xp;
  END IF;

  -- Berechne XP für korrekte Unterfragen
  IF subquestion_ids IS NOT NULL AND array_length(subquestion_ids, 1) > 0 THEN
    SELECT COALESCE(SUM(xp_value), 0) INTO subquestion_xp
    FROM cases_subquestions
    WHERE id = ANY(subquestion_ids);
    
    total_xp := total_xp + subquestion_xp;
  END IF;

  -- Aktualisiere die XP des Benutzers
  UPDATE user_stats
  SET total_xp = total_xp + COALESCE(total_xp, 0)
  WHERE user_id = user_id_param;

  RETURN total_xp;
END;
$$;


ALTER FUNCTION "public"."calculate_and_award_xp"("user_id_param" "uuid", "question_ids" integer[], "subquestion_ids" integer[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_answer"("p_question_id" integer, "p_answer" "text", "p_type" "text", "p_subquestion_id" integer DEFAULT NULL::integer, "p_is_correct" boolean DEFAULT NULL::boolean) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_correct_answer TEXT;
    v_is_correct BOOLEAN;
    v_dragdrop_pair RECORD;
BEGIN
    CASE p_type
        WHEN 'question' THEN  -- Standard-Fragetyp
            SELECT "Richtige Antwort" INTO v_correct_answer
            FROM questions
            WHERE id = p_question_id;
            
            v_is_correct := LOWER(TRIM(p_answer)) = LOWER(TRIM(v_correct_answer));
            
        WHEN 'multiple_choice' THEN
            SELECT "Richtige Antwort" INTO v_correct_answer
            FROM questions
            WHERE id = p_question_id;
            
            v_is_correct := LOWER(TRIM(p_answer)) = LOWER(TRIM(v_correct_answer));
            
        WHEN 'true_false' THEN
            SELECT "Richtige Antwort" INTO v_correct_answer
            FROM questions
            WHERE id = p_question_id;
            
            v_is_correct := (
                (LOWER(TRIM(p_answer)) = 'true' AND LOWER(TRIM(v_correct_answer)) = 'true') OR
                (LOWER(TRIM(p_answer)) = 'false' AND LOWER(TRIM(v_correct_answer)) = 'false')
            );
            
        WHEN 'drag_drop' THEN
            -- Prüfe ob die Paarung existiert und korrekt ist
            SELECT EXISTS (
                SELECT 1 
                FROM dragdrop_pairs
                WHERE question_id = p_question_id
                    AND source_text = p_answer
                    AND target_text = p_subquestion_id::TEXT
            ) INTO v_is_correct;
                
        WHEN 'lueckentext' THEN
            SELECT "Richtige Antwort" INTO v_correct_answer
            FROM questions
            WHERE id = p_question_id;
            
            v_is_correct := LOWER(TRIM(p_answer)) = LOWER(TRIM(v_correct_answer));

        WHEN 'cases' THEN
            IF p_subquestion_id IS NULL THEN
                RAISE EXCEPTION 'Für Fallfragen muss eine Unterfrage-ID angegeben werden';
            END IF;
            
            SELECT correct_answer INTO v_correct_answer
            FROM cases_subquestions
            WHERE id = p_subquestion_id;
            
            v_is_correct := LOWER(TRIM(p_answer)) = LOWER(TRIM(v_correct_answer));
            
        WHEN 'open_question' THEN
            -- Bei offenen Fragen entscheidet der Nutzer selbst
            IF p_is_correct IS NULL THEN
                RAISE EXCEPTION 'Bei offenen Fragen muss p_is_correct angegeben werden';
            END IF;
            
            v_is_correct := p_is_correct;
            
        ELSE
            v_is_correct := false;
    END CASE;
    
    RETURN v_is_correct;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Fehler bei der Antwortprüfung: %', SQLERRM;
END;
$$;


ALTER FUNCTION "public"."check_answer"("p_question_id" integer, "p_answer" "text", "p_type" "text", "p_subquestion_id" integer, "p_is_correct" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_case_answers"("p_question_id" integer, "p_answers" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_result jsonb;
  v_subquestion record;
  v_is_correct boolean;
BEGIN
  v_result := '[]'::jsonb;
  
  FOR v_subquestion IN 
    SELECT id, correct_answer, statement_text
    FROM cases_subquestions
    WHERE question_id = p_question_id
  LOOP
    SELECT (jsonb_array_elements(p_answers)->>'answer')::text = v_subquestion.correct_answer
    INTO v_is_correct
    WHERE (jsonb_array_elements(p_answers)->>'subquestion_id')::integer = v_subquestion.id;
    
    v_result := v_result || jsonb_build_object(
      'subquestion_id', v_subquestion.id,
      'statement_text', v_subquestion.statement_text,
      'is_correct', COALESCE(v_is_correct, false)
    );
  END LOOP;
  
  RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."check_case_answers"("p_question_id" integer, "p_answers" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_dragdrop_group"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  INSERT INTO dragdrop_groups (question_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_dragdrop_group"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."finalize_pvp_match"("match_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  p1 UUID;
  p2 UUID;
  p1_hp INTEGER;
  p2_hp INTEGER;
  winner UUID;
  loser UUID;
BEGIN
  -- Teilnehmer ermitteln
  SELECT user_id INTO p1 FROM pvp_participants WHERE match_id = match_id LIMIT 1;
  SELECT user_id INTO p2 FROM pvp_participants WHERE match_id = match_id AND user_id != p1;

  -- HP beider Spieler
  SELECT hp INTO p1_hp FROM pvp_participants WHERE match_id = match_id AND user_id = p1;
  SELECT hp INTO p2_hp FROM pvp_participants WHERE match_id = match_id AND user_id = p2;

  -- Prüfen, ob Match schon beendet
  IF EXISTS (
    SELECT 1 FROM pvp_matches WHERE id = match_id AND status = 'finished'
  ) THEN
    RETURN '🚫 Match wurde bereits abgeschlossen';
  END IF;

  -- Sieger bestimmen
  IF p1_hp > p2_hp THEN
    winner := p1;
    loser := p2;
  ELSIF p2_hp > p1_hp THEN
    winner := p2;
    loser := p1;
  ELSE
    winner := NULL; -- Unentschieden
  END IF;

  -- Matchstatus aktualisieren
  UPDATE pvp_matches SET status = 'finished' WHERE id = match_id;

  -- XP/Coins vergeben
  IF winner IS NOT NULL THEN
    -- Gewinner
    UPDATE user_stats SET xp = xp + 50, coins = coins + 50 WHERE user_id = winner;
    -- Verlierer
    UPDATE user_stats SET xp = xp + 20, coins = coins + 20 WHERE user_id = loser;
  ELSE
    -- Unentschieden
    UPDATE user_stats SET xp = xp + 30, coins = coins + 30
    WHERE user_id IN (p1, p2);
  END IF;

  RETURN '✅ Match abgeschlossen';
END;
$$;


ALTER FUNCTION "public"."finalize_pvp_match"("match_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_answer_stats"("user_id" "uuid") RETURNS TABLE("subject_name" "text", "correct_answers" integer)
    LANGUAGE "sql"
    AS $$
  SELECT
    s.name AS subject_name,
    COUNT(*) AS correct_answers
  FROM answered_questions aq
  JOIN questions q ON aq.question_id = q.id
  JOIN courses c ON q.course_id = c.id
  JOIN subjects s ON c.subject_id = s.id
  WHERE aq.user_id = get_answer_stats.user_id
    AND aq.is_correct = TRUE
  GROUP BY s.name
  ORDER BY correct_answers DESC;
$$;


ALTER FUNCTION "public"."get_answer_stats"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_league_leaderboard"("league_name" "text") RETURNS TABLE("username" "text", "xp" bigint)
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
    SELECT p.username,
           s.total_xp AS xp
    FROM user_stats s
    JOIN profiles p ON p.id = s.user_id
    WHERE s.current_league = league_name
    ORDER BY s.total_xp DESC
$$;


ALTER FUNCTION "public"."get_league_leaderboard"("league_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_player_leaderboard"() RETURNS TABLE("username" "text", "xp" bigint)
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
    SELECT p.username,
           s.total_xp AS xp
    FROM user_stats s
    JOIN profiles p ON p.id = s.user_id
    ORDER BY s.total_xp DESC
    LIMIT 50
$$;


ALTER FUNCTION "public"."get_player_leaderboard"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_quiz_summary"("p_user_id" "uuid", "p_chapter_id" "uuid") RETURNS TABLE("xp_gained" integer, "xp_possible" integer)
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_main_xp_gained INTEGER := 0;
  v_sub_xp_gained INTEGER := 0;

  v_main_xp_possible INTEGER := 0;
  v_sub_xp_possible INTEGER := 0;
BEGIN
  -- XP durch korrekt beantwortete Hauptfragen (inkl. DragDrop, aber nur wenn ganz richtig)
  SELECT COALESCE(SUM(qt.base_xp), 0)
  INTO v_main_xp_gained
  FROM answered_questions aq
  JOIN questions q ON aq.question_id = q.id
  JOIN question_types qt ON q.question_type_id = qt.id_uuid
  WHERE q.chapter_id = p_chapter_id
    AND aq.user_id = p_user_id
    AND aq.is_correct = TRUE;

  -- XP durch korrekt beantwortete Subfragen (z. B. Fallfragen)
  SELECT COUNT(*) * 5
  INTO v_sub_xp_gained
  FROM answered_questions aq
  JOIN cases_subquestions cs ON aq.question_id = cs.id
  JOIN questions q ON cs.question_id = q.id
  WHERE q.chapter_id = p_chapter_id
    AND aq.user_id = p_user_id
    AND aq.is_correct = TRUE;

  -- Mögliche XP aus Hauptfragen (inkl. DragDrop als ganze Einheit)
  SELECT COALESCE(SUM(qt.base_xp), 0)
  INTO v_main_xp_possible
  FROM questions q
  JOIN question_types qt ON q.question_type_id = qt.id_uuid
  WHERE q.chapter_id = p_chapter_id;

  -- Mögliche XP aus Subfragen
  SELECT COUNT(*) * 5
  INTO v_sub_xp_possible
  FROM cases_subquestions cs
  JOIN questions q ON cs.question_id = q.id
  WHERE q.chapter_id = p_chapter_id;

  RETURN QUERY SELECT
    v_main_xp_gained + v_sub_xp_gained AS xp_gained,
    v_main_xp_possible + v_sub_xp_possible AS xp_possible;
END;
$$;


ALTER FUNCTION "public"."get_quiz_summary"("p_user_id" "uuid", "p_chapter_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_streaks"("user_id" "uuid") RETURNS TABLE("quiz_streak" integer, "daily_streak" integer, "last_quiz_update" timestamp without time zone, "last_daily_active" "date")
    LANGUAGE "sql"
    AS $$
  SELECT
    COALESCE(us.current_streak, 0) AS quiz_streak,
    COALESCE(ds.current_streak, 0) AS daily_streak,
    us.last_updated,
    ds.last_active_date
  FROM profiles p
  LEFT JOIN user_streaks us ON us.user_id = p.id
  LEFT JOIN daily_streaks ds ON ds.user_id = p.id
  WHERE p.id = get_streaks.user_id;
$$;


ALTER FUNCTION "public"."get_streaks"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_subject_breakdown_for_user"("_user_id" "uuid") RETURNS TABLE("subject_name" "text", "correct_count" integer, "wrong_count" integer, "total" integer, "correct_percent" integer)
    LANGUAGE "sql" STABLE
    AS $$
  SELECT
    s.name AS subject_name,
    SUM(CASE WHEN aq.is_correct THEN 1 ELSE 0 END) AS correct_count,
    SUM(CASE WHEN aq.is_correct THEN 0 ELSE 1 END) AS wrong_count,
    COUNT(*) AS total,
    ROUND( (SUM(CASE WHEN aq.is_correct THEN 1 ELSE 0 END)::decimal / COUNT(*) * 100) )::int AS correct_percent
  FROM answered_questions aq
  JOIN questions q
    ON q.id = aq.question_id
  JOIN chapters ch
    ON ch.id = q.chapter_id
  JOIN courses co
    ON co.id = ch.course_id
  JOIN subjects s
    ON s.id = co.subject_id
  WHERE aq.user_id = _user_id
  GROUP BY s.name
  ORDER BY s.name;
$$;


ALTER FUNCTION "public"."get_subject_breakdown_for_user"("_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_university_contributors"("uni_name" "text") RETURNS TABLE("username" "text", "total_xp" bigint, "user_id" "text")
    LANGUAGE "sql"
    AS $$
    SELECT 
        COALESCE(p.username, us.username) as username,
        COALESCE(us.total_xp, 0) as total_xp,
        p.id as user_id
    FROM profiles p
    LEFT JOIN user_stats us ON p.id = us.user_id
    WHERE p.university = uni_name
    ORDER BY us.total_xp DESC NULLS LAST;
$$;


ALTER FUNCTION "public"."get_university_contributors"("uni_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_university_leaderboard"() RETURNS TABLE("university" "text", "xp_sum" bigint)
    LANGUAGE "sql"
    AS $$
    SELECT 
        p.university,
        COALESCE(SUM(us.total_xp), 0) as xp_sum
    FROM profiles p
    LEFT JOIN user_stats us ON p.id = us.user_id
    WHERE p.university IS NOT NULL
    GROUP BY p.university
    ORDER BY xp_sum DESC;
$$;


ALTER FUNCTION "public"."get_university_leaderboard"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_items"("p_user_id" "uuid") RETURNS TABLE("item_id" "uuid", "name" "text", "type" "text", "icon_url" "text", "quantity" integer)
    LANGUAGE "sql"
    AS $$
  SELECT
    ui.item_id,
    i.name,
    i.type,
    i.icon_url,
    ui.quantity
  FROM user_items ui
  JOIN items i ON ui.item_id = i.id
  WHERE ui.user_id = p_user_id;
$$;


ALTER FUNCTION "public"."get_user_items"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_progress"("chapter_id" integer, "user_id" "uuid") RETURNS TABLE("question_id" integer, "is_answered" boolean, "is_correct" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    q.id as question_id,
    CASE WHEN aq.id IS NOT NULL THEN true ELSE false END as is_answered,
    CASE WHEN aq.is_correct IS NOT NULL THEN aq.is_correct ELSE false END as is_correct
  FROM questions q
  LEFT JOIN answered_questions aq ON q.id = aq.question_id AND aq.user_id = user_id
  WHERE q.chapter_id = chapter_id
  ORDER BY q.id;
END;
$$;


ALTER FUNCTION "public"."get_user_progress"("chapter_id" integer, "user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_progress"("user_id" "uuid", "chapter_id" bigint) RETURNS TABLE("question_id" bigint, "is_answered" boolean, "is_correct" boolean)
    LANGUAGE "sql"
    AS $$
  SELECT
    q.id AS question_id,
    aq.question_id IS NOT NULL AS is_answered,
    COALESCE(aq.is_correct, false) AS is_correct
  FROM questions q
  LEFT JOIN answered_questions aq
    ON q.id = aq.question_id AND aq.user_id = get_user_progress.user_id
  WHERE q.chapter_id = get_user_progress.chapter_id;
$$;


ALTER FUNCTION "public"."get_user_progress"("user_id" "uuid", "chapter_id" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_stats"("user_id" "uuid") RETURNS TABLE("xp" integer, "coins" integer, "level" integer, "level_title" "text", "bronze_count" integer, "silver_count" integer, "gold_count" integer, "quiz_streak" integer, "daily_streak" integer)
    LANGUAGE "sql"
    AS $$
  SELECT
    us.total_xp AS xp,
    us.total_coins AS coins,
    us.level,
    l.level_title,
    COUNT(CASE WHEN um.medal = 'bronze' THEN 1 END) AS bronze_count,
    COUNT(CASE WHEN um.medal = 'silver' THEN 1 END) AS silver_count,
    COUNT(CASE WHEN um.medal = 'gold' THEN 1 END) AS gold_count,
    COALESCE(ust.current_streak, 0) AS quiz_streak,
    COALESCE(dst.current_streak, 0) AS daily_streak
  FROM user_stats us
  LEFT JOIN levels l ON us.level = l.id
  LEFT JOIN user_medals um ON um.user_id = us.user_id
  LEFT JOIN user_streaks ust ON ust.user_id = us.user_id
  LEFT JOIN daily_streaks dst ON dst.user_id = us.user_id
  WHERE us.user_id = get_user_stats.user_id
  GROUP BY us.total_xp, us.total_coins, us.level, l.level_title, ust.current_streak, dst.current_streak;
$$;


ALTER FUNCTION "public"."get_user_stats"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  insert into public.profiles(id)
  values (new.id);
  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_answered"("user_id" "uuid", "question_id" bigint) RETURNS boolean
    LANGUAGE "sql"
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM answered_questions
    WHERE user_id = has_answered.user_id
      AND question_id = has_answered.question_id
  );
$$;


ALTER FUNCTION "public"."has_answered"("user_id" "uuid", "question_id" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_quiz_completed"("user_id" "uuid", "chapter_id" bigint) RETURNS boolean
    LANGUAGE "sql"
    AS $$
  SELECT COUNT(DISTINCT aq.question_id) = COUNT(q.id)
  FROM questions q
  LEFT JOIN answered_questions aq
    ON q.id = aq.question_id AND aq.user_id = is_quiz_completed.user_id
  WHERE q.chapter_id = is_quiz_completed.chapter_id;
$$;


ALTER FUNCTION "public"."is_quiz_completed"("user_id" "uuid", "chapter_id" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."purchase_item"("user_id" "uuid", "item_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  item_price INTEGER;
  user_coins INTEGER;
  current_quantity INTEGER;
BEGIN
  -- Preis des Items holen
  SELECT price INTO item_price FROM items WHERE id = item_id;
  IF item_price IS NULL THEN
    RETURN '🚫 Item existiert nicht';
  END IF;

  -- Coins des Nutzers holen
  SELECT coins INTO user_coins FROM profiles WHERE id = user_id;
  IF user_coins IS NULL THEN
    RETURN '🚫 Nutzer nicht gefunden';
  END IF;

  -- Prüfen, ob genug Coins vorhanden sind
  IF user_coins < item_price THEN
    RETURN '🚫 Nicht genug Coins';
  END IF;

  -- Coins abziehen
  UPDATE profiles
  SET coins = coins - item_price
  WHERE id = user_id;

  -- Prüfen, ob Item bereits vorhanden ist
  SELECT quantity INTO current_quantity
  FROM user_items
  WHERE user_id = user_id AND item_id = item_id;

  IF FOUND THEN
    -- Item existiert → Anzahl erhöhen
    UPDATE user_items
    SET quantity = quantity + 1
    WHERE user_id = user_id AND item_id = item_id;
  ELSE
    -- Neues Item eintragen
    INSERT INTO user_items (user_id, item_id, quantity)
    VALUES (user_id, item_id, 1);
  END IF;

  RETURN '✅ Item erfolgreich gekauft';
END;
$$;


ALTER FUNCTION "public"."purchase_item"("user_id" "uuid", "item_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reset_leagues"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  rec RECORD;
  promotion_threshold CONSTANT INTEGER := 10;  -- Top 10
  demotion_threshold CONSTANT INTEGER := 5;    -- Unterste 5
  next_league TEXT;
  prev_league TEXT;
BEGIN
  -- Für jede existierende Liga in user_stats
  FOR rec IN
    SELECT DISTINCT current_league FROM user_stats
  LOOP
    -- Bestimme anhand des aktuellen Liga-Namens, welches die nächsthöhere und nächstniedrigere Liga ist.
    IF rec.current_league = 'Holzliga' THEN
      next_league := 'Bronzeliga';
      prev_league := NULL;  -- Keine Abstufung, da Holzliga die unterste ist.
    ELSIF rec.current_league = 'Bronzeliga' THEN
      next_league := 'Silberliga';
      prev_league := 'Holzliga';
    ELSIF rec.current_league = 'Silberliga' THEN
      next_league := 'Goldliga';
      prev_league := 'Bronzeliga';
    ELSIF rec.current_league = 'Goldliga' THEN
      next_league := 'Platinliga';
      prev_league := 'Silberliga';
    ELSIF rec.current_league = 'Platinliga' THEN
      next_league := 'Champions League';
      prev_league := 'Goldliga';
    ELSE
      next_league := NULL;
      prev_league := NULL;
    END IF;

    -- Befördere die Top 10 (Promotion), sofern es eine nächste Liga gibt:
    IF next_league IS NOT NULL THEN
      WITH ranked AS (
        SELECT user_id, total_xp,
               ROW_NUMBER() OVER (ORDER BY total_xp DESC) as rn
        FROM user_stats
        WHERE current_league = rec.current_league
      )
      UPDATE user_stats
      SET current_league = next_league
      FROM ranked
      WHERE user_stats.user_id = ranked.user_id
        AND ranked.rn <= promotion_threshold;
    END IF;

    -- Stufe die untersten 5 Spieler ab (Demotion), sofern es eine niedrigere Liga gibt:
    IF prev_league IS NOT NULL THEN
      WITH ranked AS (
        SELECT user_id, total_xp,
               ROW_NUMBER() OVER (ORDER BY total_xp ASC) as rn
        FROM user_stats
        WHERE current_league = rec.current_league
      )
      UPDATE user_stats
      SET current_league = prev_league
      FROM ranked
      WHERE user_stats.user_id = ranked.user_id
        AND ranked.rn <= demotion_threshold;
    END IF;
  END LOOP;

  RAISE NOTICE 'Leagues have been reset with promotion/demotion logic applied.';
END;
$$;


ALTER FUNCTION "public"."reset_leagues"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reset_uni_leaderboard"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Beispiel: Setze das monatliche Score-Feld zurück
  UPDATE universities
  SET monthly_uni_scores = 0;
  
  RAISE NOTICE 'University leaderboard has been reset.';
END;
$$;


ALTER FUNCTION "public"."reset_uni_leaderboard"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."start_pvp_match"("user_id" "uuid", "opponent_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  new_match_id UUID;
BEGIN
  -- Match anlegen
  INSERT INTO pvp_matches (status)
  VALUES ('pending')
  RETURNING id INTO new_match_id;

  -- Beide Teilnehmer eintragen
  INSERT INTO match_participants (match_id, user_id)
  VALUES (new_match_id, user_id),
         (new_match_id, opponent_id);

  -- Match-ID zurückgeben
  RETURN new_match_id;
END;
$$;


ALTER FUNCTION "public"."start_pvp_match"("user_id" "uuid", "opponent_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."submit_answer"("p_user_id" "uuid", "p_question_id" integer, "p_answer" "text", "p_subquestion_id" integer DEFAULT NULL::integer, "p_streak_boost_active" boolean DEFAULT false) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_xp_awarded INTEGER := 0;
    v_coins_awarded INTEGER := 0;
    v_chapter_id INTEGER;
    v_current_progress INTEGER;
    v_new_progress INTEGER;
    v_base_xp INTEGER;
    v_streak_count INTEGER;
    v_is_correct BOOLEAN;
    already_answered BOOLEAN;
BEGIN
    -- Anti-Farming: Prüfen, ob die Frage schon beantwortet wurde
    SELECT TRUE INTO already_answered
    FROM answered_questions
    WHERE user_id = p_user_id AND question_id = p_question_id;

    IF already_answered THEN
        RETURN jsonb_build_object('error', '🚫 Diese Frage wurde bereits beantwortet.');
    END IF;

    -- Prüfe ob die Antwort korrekt ist
    SELECT check_answer(p_question_id, p_answer, p_subquestion_id) INTO v_is_correct;

    -- Kapitel aus der Frage ermitteln
    SELECT chapter_id INTO v_chapter_id
    FROM questions
    WHERE id = p_question_id;

    -- Basis-XP aus question_type ermitteln
    SELECT qt.base_xp INTO v_base_xp
    FROM questions q
    JOIN question_types qt ON q.question_type_id = qt.id
    WHERE q.id = p_question_id;

    -- Aktuelle Streak ermitteln
    SELECT current_streak INTO v_streak_count
    FROM user_streaks
    WHERE user_id = p_user_id;

    IF v_is_correct THEN
        -- XP und Coins für richtige Antwort
        v_xp_awarded := COALESCE(v_base_xp, 10); -- Fallback auf 10 XP wenn kein base_xp definiert
        v_coins_awarded := 10;

        -- Streak nur behandeln wenn Streak-Boost aktiv ist
        IF p_streak_boost_active THEN
            IF v_streak_count >= 2 THEN -- Bei 3. richtiger Antwort in Folge
                v_xp_awarded := v_xp_awarded + 30; -- Bonus XP
                -- Streak zurücksetzen
                UPDATE user_streaks 
                SET current_streak = 0,
                    last_updated = NOW()
                WHERE user_id = p_user_id;
            ELSE
                -- Streak erhöhen
                UPDATE user_streaks 
                SET current_streak = COALESCE(current_streak, 0) + 1,
                    last_updated = NOW()
                WHERE user_id = p_user_id;
            END IF;
        END IF;
    ELSE
        -- Münzverlust bei falscher Antwort
        v_coins_awarded := -5;
        -- Streak zurücksetzen
        UPDATE user_streaks 
        SET current_streak = 0,
            last_updated = NOW()
        WHERE user_id = p_user_id;
    END IF;

    -- Antwort speichern
    INSERT INTO answered_questions (
        user_id, 
        question_id, 
        is_correct,
        given_answer,
        chapter_id, 
        answered_at
    ) VALUES (
        p_user_id, 
        p_question_id, 
        v_is_correct,
        p_answer,
        v_chapter_id, 
        NOW()
    );

    -- Update der user_stats
    UPDATE user_stats
    SET
        total_xp = COALESCE(total_xp, 0) + v_xp_awarded,
        total_coins = GREATEST(COALESCE(total_coins, 0) + v_coins_awarded, 0), -- Verhindert negative Coins
        questions_answered = COALESCE(questions_answered, 0) + 1,
        correct_answers = COALESCE(correct_answers, 0) + CASE WHEN v_is_correct THEN 1 ELSE 0 END,
        last_played = NOW()
    WHERE user_id = p_user_id;

    -- Fortschritt berechnen
    SELECT 
        ROUND((COUNT(*)::float / (SELECT COUNT(*) FROM questions WHERE chapter_id = v_chapter_id)) * 100)::integer
    INTO v_new_progress
    FROM answered_questions
    WHERE user_id = p_user_id 
        AND chapter_id = v_chapter_id 
        AND is_correct = TRUE;

    -- Fortschritt speichern/aktualisieren
    INSERT INTO quiz_progress (
        user_id, 
        chapter_id, 
        progress, 
        updated_at
    ) VALUES (
        p_user_id, 
        v_chapter_id, 
        v_new_progress, 
        NOW()
    )
    ON CONFLICT (user_id, chapter_id)
    DO UPDATE SET 
        progress = v_new_progress, 
        updated_at = NOW();

    -- Daily Streak aktualisieren
    PERFORM update_daily_streak(p_user_id);
    
    -- Level-Check
    PERFORM update_level_on_xp_change(p_user_id);

    -- Medaillen prüfen und vergeben wenn Kapitel komplett
    IF (
        SELECT COUNT(DISTINCT aq.question_id) = (
            SELECT COUNT(*) FROM questions WHERE chapter_id = v_chapter_id
        )
        FROM answered_questions aq
        WHERE aq.user_id = p_user_id 
            AND aq.chapter_id = v_chapter_id
    ) THEN
        PERFORM assign_medals_on_completion(p_user_id, v_chapter_id);
    END IF;

    RETURN jsonb_build_object(
        'xp_awarded', v_xp_awarded,
        'coins_awarded', v_coins_awarded,
        'new_progress', v_new_progress,
        'streak', COALESCE(v_streak_count, 0),
        'is_correct', v_is_correct
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('error', SQLERRM);
END;
$$;


ALTER FUNCTION "public"."submit_answer"("p_user_id" "uuid", "p_question_id" integer, "p_answer" "text", "p_subquestion_id" integer, "p_streak_boost_active" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."submit_pvp_answer"("user_id" "uuid", "match_id" "uuid", "question_id" "uuid", "is_correct" boolean) RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  already_answered INTEGER;
BEGIN
  -- Prüfen, ob Frage schon beantwortet wurde (Anti-Farming)
  SELECT COUNT(*) INTO already_answered
  FROM pvp_answers
  WHERE user_id = user_id
    AND match_id = match_id
    AND question_id = question_id;

  IF already_answered > 0 THEN
    RETURN '🚫 Frage bereits beantwortet';
  END IF;

  -- Antwort eintragen
  INSERT INTO pvp_answers (user_id, match_id, question_id, is_correct)
  VALUES (user_id, match_id, question_id, is_correct);

  -- Punkte vergeben bei richtiger Antwort
  IF is_correct THEN
    UPDATE match_participants
    SET score = score + 10
    WHERE user_id = user_id AND match_id = match_id;
  END IF;

  RETURN '✅ Antwort gespeichert';
END;
$$;


ALTER FUNCTION "public"."submit_pvp_answer"("user_id" "uuid", "match_id" "uuid", "question_id" "uuid", "is_correct" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."submit_pvp_response"("user_id" "uuid", "match_id" "uuid", "question_id" bigint, "is_correct" boolean, "response_time_ms" integer) RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  damage_to_enemy INTEGER := 0;
  self_penalty INTEGER := 0;
  opponent_id UUID;
BEGIN
  -- Anti-Farming: Frage schon beantwortet?
  IF EXISTS (
    SELECT 1 FROM pvp_responses
    WHERE match_id = match_id AND user_id = user_id AND question_id = question_id
  ) THEN
    RETURN '🚫 Frage bereits beantwortet';
  END IF;

  -- Gegner ermitteln
  SELECT user_id INTO opponent_id
  FROM pvp_participants
  WHERE match_id = match_id AND user_id != user_id;

  -- Schadensberechnung
  IF is_correct THEN
    -- Weniger Zeit = mehr Schaden (Basis: 20 - response_time_ms / 1000 capped)
    damage_to_enemy := GREATEST(10, LEAST(20, 25 - response_time_ms / 1000));
  ELSE
    self_penalty := 10;
  END IF;

  -- Antwort speichern
  INSERT INTO pvp_responses (match_id, user_id, question_id, is_correct, damage_done, self_damage)
  VALUES (match_id, user_id, question_id, is_correct, damage_to_enemy, self_penalty);

  -- HP aktualisieren
  IF is_correct THEN
    UPDATE pvp_participants
    SET hp = hp - damage_to_enemy
    WHERE match_id = match_id AND user_id = opponent_id;
  ELSE
    UPDATE pvp_participants
    SET hp = hp - self_penalty
    WHERE match_id = match_id AND user_id = user_id;
  END IF;

  RETURN '✅ Antwort verarbeitet';
END;
$$;


ALTER FUNCTION "public"."submit_pvp_response"("user_id" "uuid", "match_id" "uuid", "question_id" bigint, "is_correct" boolean, "response_time_ms" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_daily_streak"("user_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  berlin_today DATE := timezone('Europe/Berlin', now())::DATE;
  yesterday DATE := berlin_today - INTERVAL '1 day';
  last_date DATE;
BEGIN
  -- Sicherstellen, dass Eintrag existiert
  INSERT INTO daily_streaks (user_id, current_streak, last_active_date)
  VALUES (user_id, 1, berlin_today)
  ON CONFLICT (user_id) DO NOTHING;

  -- Letztes Aktivitätsdatum holen
  SELECT last_active_date INTO last_date
  FROM daily_streaks
  WHERE user_id = user_id;

  IF last_date = berlin_today THEN
    RETURN '✅ Heute bereits gezählt';
  ELSIF last_date = yesterday THEN
    -- Streak +1
    UPDATE daily_streaks
    SET current_streak = current_streak + 1,
        last_active_date = berlin_today,
        last_updated = NOW()
    WHERE user_id = user_id;

    RETURN '🔥 Streak erhöht';
  ELSE
    -- Streak reset
    UPDATE daily_streaks
    SET current_streak = 1,
        last_active_date = berlin_today,
        last_updated = NOW()
    WHERE user_id = user_id;

    RETURN '❄️ Streak zurückgesetzt';
  END IF;
END;
$$;


ALTER FUNCTION "public"."update_daily_streak"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_league_groups"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  WITH ranked AS (
    SELECT 
      user_id,
      current_league,  -- z. B. "Holzliga", "Bronzeliga" etc.
      ROW_NUMBER() OVER (PARTITION BY current_league ORDER BY total_xp DESC) AS rn
    FROM user_stats
  )
  UPDATE user_stats us
  SET league_group = CONCAT(us.current_league, ' ', CEIL(r.rn::numeric / 30))
  FROM ranked r
  WHERE us.user_id = r.user_id;
END;
$$;


ALTER FUNCTION "public"."update_league_groups"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_level_from_stats()"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$BEGIN
  -- Suche das höchste Level, dessen xp_required <= NEW.total_xp
  SELECT level_number
    INTO NEW.level
    FROM levels
    WHERE xp_required <= NEW.total_xp
    ORDER BY xp_required DESC
    LIMIT 1;

  RETURN NEW;
END;$$;


ALTER FUNCTION "public"."update_level_from_stats()"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_level_on_xp_change"("user_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$DECLARE
  user_xp INTEGER;
  best_level_id INTEGER;
  current_level_id INTEGER;
BEGIN
  -- Aktuelle XP holen
  SELECT xp INTO user_xp
  FROM user_stats
  WHERE user_id = user_id;

  -- Bestmögliches Level ermitteln (alle Levels, die die XP-Schwelle erfüllen)
  SELECT id INTO best_level_id
  FROM levels
  WHERE xp_required <= user_xp
  ORDER BY xp_required DESC
  LIMIT 1;

  -- Aktuelles Level holen
  SELECT level_id INTO current_level_id
  FROM user_stats
  WHERE user_id = user_id;

  -- Nur aktualisieren, wenn höher
  IF best_level_id IS NOT NULL AND best_level_id > current_level_id THEN
    UPDATE user_stats
    SET level_id = best_level_id
    WHERE user_id = user_id;

    RETURN '🏆 Level up auf ' || best_level_id;
  END IF;

  RETURN 'ℹ️ Level bleibt gleich';
END;$$;


ALTER FUNCTION "public"."update_level_on_xp_change"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_match_score"("match_id" "uuid", "user_id" "uuid", "is_correct" boolean) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Punktestand für den Spieler aktualisieren
  UPDATE match_participants
  SET score = score + CASE WHEN is_correct THEN 10 ELSE 0 END
  WHERE match_id = match_id AND user_id = user_id;
END;
$$;


ALTER FUNCTION "public"."update_match_score"("match_id" "uuid", "user_id" "uuid", "is_correct" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_streak"("user_id" "uuid", "is_correct" boolean) RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  streak_value INTEGER;
BEGIN
  -- Sicherstellen, dass Streak-Eintrag existiert
  INSERT INTO user_streaks (user_id, current_streak)
  VALUES (user_id, 0)
  ON CONFLICT (user_id) DO NOTHING;

  IF is_correct THEN
    -- Streak erhöhen
    UPDATE user_streaks
    SET current_streak = current_streak + 1,
        last_updated = NOW()
    WHERE user_id = user_id;

    -- Prüfen, ob Streak 3 erreicht wurde
    SELECT current_streak INTO streak_value
    FROM user_streaks
    WHERE user_id = user_id;

    IF streak_value >= 3 THEN
      -- Bonus-XP vergeben
      UPDATE user_stats
      SET xp = xp + 30
      WHERE user_id = user_id;

      -- Streak zurücksetzen
      UPDATE user_streaks
      SET current_streak = 0
      WHERE user_id = user_id;

      RETURN '✅ Streak-Bonus vergeben';
    ELSE
      RETURN '✅ Streak erhöht auf ' || streak_value;
    END IF;

  ELSE
    -- Streak zurücksetzen bei falscher Antwort
    UPDATE user_streaks
    SET current_streak = 0,
        last_updated = NOW()
    WHERE user_id = user_id;

    RETURN '🚫 Streak zurückgesetzt';
  END IF;
END;
$$;


ALTER FUNCTION "public"."update_streak"("user_id" "uuid", "is_correct" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_subquestions_count"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE questions
  SET subquestions_count = (
    SELECT COUNT(*) FROM cases_subquestions WHERE question_id = NEW.question_id
  )
  WHERE id = NEW.question_id;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_subquestions_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."use_item"("user_id" "uuid", "item_id" "uuid", "question_id" bigint) RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  remaining INTEGER;
BEGIN
  -- Check: hat der User das Item überhaupt?
  SELECT quantity INTO remaining
  FROM user_items
  WHERE user_id = user_id AND item_id = item_id;

  IF remaining IS NULL OR remaining <= 0 THEN
    RETURN '🚫 Kein Item vorhanden';
  END IF;

  -- Item verbrauchen
  UPDATE user_items
  SET quantity = quantity - 1
  WHERE user_id = user_id AND item_id = item_id;

  RETURN '✅ Item verwendet';
END;
$$;


ALTER FUNCTION "public"."use_item"("user_id" "uuid", "item_id" "uuid", "question_id" bigint) OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."answered_cases_subquestions" (
    "id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "subquestion_id" bigint NOT NULL,
    "is_correct" boolean
);


ALTER TABLE "public"."answered_cases_subquestions" OWNER TO "postgres";


ALTER TABLE "public"."answered_cases_subquestions" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."answered_cases_subquestions_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."answered_questions" (
    "id" bigint NOT NULL,
    "user_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "question_id" bigint,
    "is_correct" boolean,
    "answered_at" timestamp without time zone,
    "chapter_id" integer
);


ALTER TABLE "public"."answered_questions" OWNER TO "postgres";


ALTER TABLE "public"."answered_questions" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."answered_questions_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."cases_subquestions" (
    "id" bigint NOT NULL,
    "question_id" bigint NOT NULL,
    "statement_text" "text" NOT NULL,
    "correct_answer" "text" NOT NULL,
    "explanation" "text"
);


ALTER TABLE "public"."cases_subquestions" OWNER TO "postgres";


ALTER TABLE "public"."cases_subquestions" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."cases_subquestions_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."chapters" (
    "id" bigint NOT NULL,
    "course_id" bigint NOT NULL,
    "name" "text"
);


ALTER TABLE "public"."chapters" OWNER TO "postgres";


ALTER TABLE "public"."chapters" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."chapters_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."courses" (
    "id" bigint NOT NULL,
    "subject_id" bigint NOT NULL,
    "name" "text"
);


ALTER TABLE "public"."courses" OWNER TO "postgres";


ALTER TABLE "public"."courses" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."courses_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."daily_streaks" (
    "user_id" "uuid" NOT NULL,
    "current_streak" integer DEFAULT 1,
    "last_active_date" "date" NOT NULL,
    "last_updated" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."daily_streaks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."dragdrop_groups" (
    "id" bigint NOT NULL,
    "question_id" bigint NOT NULL,
    "group_name" "text"
);


ALTER TABLE "public"."dragdrop_groups" OWNER TO "postgres";


ALTER TABLE "public"."dragdrop_groups" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."dragdrop_groups_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."dragdrop_pairs" (
    "id" bigint NOT NULL,
    "group_id" bigint NOT NULL,
    "drag_text" "text",
    "correct_match" "text"
);


ALTER TABLE "public"."dragdrop_pairs" OWNER TO "postgres";


ALTER TABLE "public"."dragdrop_pairs" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."dragdrop_pairs_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."item_usage_log" (
    "id" integer NOT NULL,
    "user_id" "uuid",
    "item_id" integer,
    "used_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."item_usage_log" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."item_usage_log_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."item_usage_log_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."item_usage_log_id_seq" OWNED BY "public"."item_usage_log"."id";



CREATE TABLE IF NOT EXISTS "public"."items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "price" integer NOT NULL,
    "type" "text",
    "icon_url" "text",
    CONSTRAINT "items_type_check" CHECK (("type" = ANY (ARRAY['joker'::"text", 'avatar'::"text", 'pvp_boost'::"text", 'cosmetic'::"text"])))
);


ALTER TABLE "public"."items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."league_positions" (
    "user_id" "uuid" NOT NULL,
    "league_name" "text" NOT NULL,
    "points" bigint DEFAULT 0,
    "ranking" integer,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."league_positions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."leagues" (
    "id" bigint NOT NULL,
    "name" "text" NOT NULL,
    "league_img" "text"
);


ALTER TABLE "public"."leagues" OWNER TO "postgres";


ALTER TABLE "public"."leagues" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."leagues_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."levels" (
    "id" integer NOT NULL,
    "level_number" integer NOT NULL,
    "xp_required" bigint NOT NULL,
    "level_image" "text",
    "level_title" "text"
);


ALTER TABLE "public"."levels" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."levels_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."levels_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."levels_id_seq" OWNED BY "public"."levels"."id";



CREATE TABLE IF NOT EXISTS "public"."match_participants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "match_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "joined_at" timestamp without time zone DEFAULT "now"(),
    "score" integer DEFAULT 0
);


ALTER TABLE "public"."match_participants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."medals" (
    "id" "text" NOT NULL,
    "name" "text",
    "description" "text",
    "icon_url" "text"
);


ALTER TABLE "public"."medals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."monthly_uni_scores" (
    "id" integer NOT NULL,
    "university_id" integer,
    "xp_this_month" integer DEFAULT 0 NOT NULL,
    "month_start" "date" NOT NULL,
    "month_end" "date" NOT NULL
);


ALTER TABLE "public"."monthly_uni_scores" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."monthly_uni_scores_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."monthly_uni_scores_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."monthly_uni_scores_id_seq" OWNED BY "public"."monthly_uni_scores"."id";



CREATE TABLE IF NOT EXISTS "public"."multiple_choice_options" (
    "id" bigint NOT NULL,
    "question_id" bigint NOT NULL,
    "option_text" "text" NOT NULL,
    "is_correct" boolean NOT NULL
);


ALTER TABLE "public"."multiple_choice_options" OWNER TO "postgres";


ALTER TABLE "public"."multiple_choice_options" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."multiple_choice_options_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "username" "text",
    "avatar_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "university" "text"
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pvp_answers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "match_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "question_id" bigint NOT NULL,
    "is_correct" boolean,
    "answered_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."pvp_answers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pvp_matches" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "quiz_id" "uuid",
    "status" "text" DEFAULT 'pending'::"text",
    "mode" "text" NOT NULL,
    CONSTRAINT "pvp_matches_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'active'::"text", 'finished'::"text"])))
);


ALTER TABLE "public"."pvp_matches" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pvp_participants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "match_id" "uuid",
    "user_id" "uuid",
    "hp" integer DEFAULT 100,
    "score" integer DEFAULT 0,
    "finished" boolean DEFAULT false
);


ALTER TABLE "public"."pvp_participants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pvp_responses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "match_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "question_id" bigint NOT NULL,
    "is_correct" boolean,
    "damage_done" integer DEFAULT 0,
    "self_damage" integer DEFAULT 0,
    "answered_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."pvp_responses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."question_types" (
    "id" "text" NOT NULL,
    "base_xp" integer DEFAULT 10 NOT NULL,
    "base_coins" integer DEFAULT 10 NOT NULL,
    "is_bonus" boolean DEFAULT false,
    "base_lose_coins" integer,
    "bonus_table" "text",
    "bonus_column" "text",
    "uuid_id" "uuid" DEFAULT "gen_random_uuid"(),
    "id_uuid" "uuid" DEFAULT "gen_random_uuid"() NOT NULL
);


ALTER TABLE "public"."question_types" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."questions" (
    "id" bigint NOT NULL,
    "chapter_id" bigint NOT NULL,
    "Frage" "text",
    "type" "text",
    "Antwort A" "text",
    "Antwort B" "text",
    "Antwort C" "text",
    "Antwort D" "text",
    "Richtige Antwort" "text",
    "Begruendung" "text",
    "course_id" bigint,
    "subquestions_count" integer DEFAULT 0,
    "question_type" "text",
    "question_type_id" "uuid"
);


ALTER TABLE "public"."questions" OWNER TO "postgres";


ALTER TABLE "public"."questions" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."questions_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."quiz_progress" (
    "id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "chapter_id" integer NOT NULL,
    "progress" integer DEFAULT 0 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."quiz_progress" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."quiz_progress_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."quiz_progress_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."quiz_progress_id_seq" OWNED BY "public"."quiz_progress"."id";



CREATE TABLE IF NOT EXISTS "public"."sequence_items" (
    "id" bigint NOT NULL,
    "question_id" bigint,
    "text" "text",
    "correct_position" bigint,
    "level" "text"
);


ALTER TABLE "public"."sequence_items" OWNER TO "postgres";


ALTER TABLE "public"."sequence_items" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."sequence_items_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."shop_avatars" (
    "id" integer NOT NULL,
    "image_url" "text" NOT NULL,
    "price" integer NOT NULL,
    "active" boolean DEFAULT true,
    "title" "text",
    "category" "text"
);


ALTER TABLE "public"."shop_avatars" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."shop_avatars_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."shop_avatars_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."shop_avatars_id_seq" OWNED BY "public"."shop_avatars"."id";



CREATE TABLE IF NOT EXISTS "public"."subjects" (
    "id" bigint NOT NULL,
    "name" "text" NOT NULL
);


ALTER TABLE "public"."subjects" OWNER TO "postgres";


ALTER TABLE "public"."subjects" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."subjects_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."universities" (
    "id" integer NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "xp_total" bigint
);


ALTER TABLE "public"."universities" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."universities_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."universities_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."universities_id_seq" OWNED BY "public"."universities"."id";



CREATE TABLE IF NOT EXISTS "public"."user_avatars" (
    "user_id" "uuid" NOT NULL,
    "avatar_id" bigint NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_avatars" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_items" (
    "user_id" "uuid" NOT NULL,
    "is_active" boolean DEFAULT true,
    "quantity" integer DEFAULT 1,
    "acquired_at" timestamp without time zone DEFAULT "now"(),
    "item_id" "uuid"
);


ALTER TABLE "public"."user_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_medals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "quiz_id" "uuid" NOT NULL,
    "medal" "text" NOT NULL,
    "awarded_at" timestamp without time zone DEFAULT "now"(),
    CONSTRAINT "user_medals_medal_check" CHECK (("medal" = ANY (ARRAY['bronze'::"text", 'silver'::"text", 'gold'::"text"])))
);


ALTER TABLE "public"."user_medals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_stats" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "total_xp" bigint,
    "total_coins" bigint,
    "level" bigint,
    "title" "text",
    "created_at" timestamp with time zone,
    "streak" integer,
    "avatar_url" "text",
    "gold_medals" integer DEFAULT 0,
    "silver_medals" integer DEFAULT 0,
    "bronze_medals" integer DEFAULT 0,
    "last_played" timestamp with time zone,
    "current_league" "text",
    "updated_at" timestamp with time zone,
    "league_group" "text",
    "username" "text",
    "questions_answered" bigint,
    "correct_answers" bigint
);


ALTER TABLE "public"."user_stats" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_streaks" (
    "user_id" "uuid" NOT NULL,
    "current_streak" integer DEFAULT 0,
    "last_updated" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_streaks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."versions" (
    "id" integer NOT NULL,
    "table_name" character varying(255) NOT NULL,
    "data" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."versions" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."versions_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."versions_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."versions_id_seq" OWNED BY "public"."versions"."id";



ALTER TABLE ONLY "public"."item_usage_log" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."item_usage_log_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."levels" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."levels_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."monthly_uni_scores" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."monthly_uni_scores_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."quiz_progress" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."quiz_progress_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."shop_avatars" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."shop_avatars_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."universities" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."universities_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."versions" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."versions_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."answered_cases_subquestions"
    ADD CONSTRAINT "answered_cases_subquestions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."answered_questions"
    ADD CONSTRAINT "answered_questions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cases_subquestions"
    ADD CONSTRAINT "cases_subquestions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chapters"
    ADD CONSTRAINT "chapters_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."courses"
    ADD CONSTRAINT "courses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."daily_streaks"
    ADD CONSTRAINT "daily_streaks_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."dragdrop_groups"
    ADD CONSTRAINT "dragdrop_groups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dragdrop_pairs"
    ADD CONSTRAINT "dragdrop_pairs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."item_usage_log"
    ADD CONSTRAINT "item_usage_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."items"
    ADD CONSTRAINT "items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."league_positions"
    ADD CONSTRAINT "league_positions_pkey" PRIMARY KEY ("user_id", "league_name");



ALTER TABLE ONLY "public"."leagues"
    ADD CONSTRAINT "leagues_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."levels"
    ADD CONSTRAINT "levels_level_number_key" UNIQUE ("level_number");



ALTER TABLE ONLY "public"."levels"
    ADD CONSTRAINT "levels_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."match_participants"
    ADD CONSTRAINT "match_participants_match_id_user_id_key" UNIQUE ("match_id", "user_id");



ALTER TABLE ONLY "public"."match_participants"
    ADD CONSTRAINT "match_participants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."medals"
    ADD CONSTRAINT "medals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."monthly_uni_scores"
    ADD CONSTRAINT "monthly_uni_scores_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."multiple_choice_options"
    ADD CONSTRAINT "multiple_choice_options_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pvp_answers"
    ADD CONSTRAINT "pvp_answers_match_id_user_id_question_id_key" UNIQUE ("match_id", "user_id", "question_id");



ALTER TABLE ONLY "public"."pvp_answers"
    ADD CONSTRAINT "pvp_answers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pvp_matches"
    ADD CONSTRAINT "pvp_matches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pvp_participants"
    ADD CONSTRAINT "pvp_participants_match_id_user_id_key" UNIQUE ("match_id", "user_id");



ALTER TABLE ONLY "public"."pvp_participants"
    ADD CONSTRAINT "pvp_participants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pvp_responses"
    ADD CONSTRAINT "pvp_responses_match_id_user_id_question_id_key" UNIQUE ("match_id", "user_id", "question_id");



ALTER TABLE ONLY "public"."pvp_responses"
    ADD CONSTRAINT "pvp_responses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."question_types"
    ADD CONSTRAINT "question_types_pkey_uuid" PRIMARY KEY ("id_uuid");



ALTER TABLE ONLY "public"."questions"
    ADD CONSTRAINT "questions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quiz_progress"
    ADD CONSTRAINT "quiz_progress_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quiz_progress"
    ADD CONSTRAINT "quiz_progress_user_id_chapter_id_key" UNIQUE ("user_id", "chapter_id");



ALTER TABLE ONLY "public"."sequence_items"
    ADD CONSTRAINT "sequence_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shop_avatars"
    ADD CONSTRAINT "shop_avatars_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subjects"
    ADD CONSTRAINT "subjects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."answered_cases_subquestions"
    ADD CONSTRAINT "unique_user_subquestion" UNIQUE ("user_id", "subquestion_id");



ALTER TABLE ONLY "public"."universities"
    ADD CONSTRAINT "universities_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."universities"
    ADD CONSTRAINT "universities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_avatars"
    ADD CONSTRAINT "user_avatars_pkey" PRIMARY KEY ("user_id", "avatar_id");



ALTER TABLE ONLY "public"."user_medals"
    ADD CONSTRAINT "user_medals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_medals"
    ADD CONSTRAINT "user_medals_user_id_quiz_id_key" UNIQUE ("user_id", "quiz_id");



ALTER TABLE ONLY "public"."user_stats"
    ADD CONSTRAINT "user_stats_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_stats"
    ADD CONSTRAINT "user_stats_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."user_streaks"
    ADD CONSTRAINT "user_streaks_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."versions"
    ADD CONSTRAINT "versions_pkey" PRIMARY KEY ("id");



CREATE OR REPLACE TRIGGER "auto_create_group" AFTER INSERT ON "public"."questions" FOR EACH ROW WHEN (("new"."question_type_id" = '9a1d8851-7059-4dd2-bf3a-b954f456262a'::"uuid")) EXECUTE FUNCTION "public"."create_dragdrop_group"();



CREATE OR REPLACE TRIGGER "cases_subquestions_delete" AFTER DELETE ON "public"."cases_subquestions" FOR EACH ROW EXECUTE FUNCTION "public"."update_subquestions_count"();



CREATE OR REPLACE TRIGGER "cases_subquestions_insert" AFTER INSERT ON "public"."cases_subquestions" FOR EACH ROW EXECUTE FUNCTION "public"."update_subquestions_count"();



CREATE OR REPLACE TRIGGER "cases_subquestions_update" AFTER UPDATE ON "public"."cases_subquestions" FOR EACH ROW EXECUTE FUNCTION "public"."update_subquestions_count"();



CREATE OR REPLACE TRIGGER "trg_user_stats_level" BEFORE UPDATE ON "public"."user_stats" FOR EACH ROW WHEN (("old"."total_xp" IS DISTINCT FROM "new"."total_xp")) EXECUTE FUNCTION "public"."update_level_from_stats()"();



CREATE OR REPLACE TRIGGER "trigger_update_subquestions_count" AFTER INSERT OR DELETE OR UPDATE ON "public"."cases_subquestions" FOR EACH ROW EXECUTE FUNCTION "public"."update_subquestions_count"();



ALTER TABLE ONLY "public"."answered_cases_subquestions"
    ADD CONSTRAINT "answered_cases_subquestions_subquestion_id_fkey" FOREIGN KEY ("subquestion_id") REFERENCES "public"."cases_subquestions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."answered_questions"
    ADD CONSTRAINT "answered_questions_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id");



ALTER TABLE ONLY "public"."answered_questions"
    ADD CONSTRAINT "answered_questions_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id");



ALTER TABLE ONLY "public"."cases_subquestions"
    ADD CONSTRAINT "cases_subquestions_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chapters"
    ADD CONSTRAINT "chapters_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id");



ALTER TABLE ONLY "public"."courses"
    ADD CONSTRAINT "courses_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id");



ALTER TABLE ONLY "public"."daily_streaks"
    ADD CONSTRAINT "daily_streaks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."dragdrop_groups"
    ADD CONSTRAINT "dragdrop_groups_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id");



ALTER TABLE ONLY "public"."dragdrop_pairs"
    ADD CONSTRAINT "dragdrop_pairs_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."dragdrop_groups"("id");



ALTER TABLE ONLY "public"."questions"
    ADD CONSTRAINT "fk_question_type" FOREIGN KEY ("question_type_id") REFERENCES "public"."question_types"("id_uuid");



ALTER TABLE ONLY "public"."item_usage_log"
    ADD CONSTRAINT "item_usage_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."league_positions"
    ADD CONSTRAINT "league_positions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."match_participants"
    ADD CONSTRAINT "match_participants_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "public"."pvp_matches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."match_participants"
    ADD CONSTRAINT "match_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."monthly_uni_scores"
    ADD CONSTRAINT "monthly_uni_scores_university_id_fkey" FOREIGN KEY ("university_id") REFERENCES "public"."universities"("id");



ALTER TABLE ONLY "public"."multiple_choice_options"
    ADD CONSTRAINT "multiple_choice_options_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pvp_answers"
    ADD CONSTRAINT "pvp_answers_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "public"."pvp_matches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pvp_answers"
    ADD CONSTRAINT "pvp_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pvp_answers"
    ADD CONSTRAINT "pvp_answers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pvp_participants"
    ADD CONSTRAINT "pvp_participants_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "public"."pvp_matches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pvp_participants"
    ADD CONSTRAINT "pvp_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pvp_responses"
    ADD CONSTRAINT "pvp_responses_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "public"."pvp_matches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pvp_responses"
    ADD CONSTRAINT "pvp_responses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."questions"
    ADD CONSTRAINT "questions_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id");



ALTER TABLE ONLY "public"."questions"
    ADD CONSTRAINT "questions_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id");



ALTER TABLE ONLY "public"."quiz_progress"
    ADD CONSTRAINT "quiz_progress_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id");



ALTER TABLE ONLY "public"."quiz_progress"
    ADD CONSTRAINT "quiz_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."sequence_items"
    ADD CONSTRAINT "sequence_items_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id");



ALTER TABLE ONLY "public"."user_avatars"
    ADD CONSTRAINT "user_avatars_avatar_id_fkey" FOREIGN KEY ("avatar_id") REFERENCES "public"."shop_avatars"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_avatars"
    ADD CONSTRAINT "user_avatars_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_items"
    ADD CONSTRAINT "user_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."user_medals"
    ADD CONSTRAINT "user_medals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_streaks"
    ADD CONSTRAINT "user_streaks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



CREATE POLICY "Enable delete for users based on user_id" ON "public"."profiles" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "id"));



CREATE POLICY "Enable insert for authenticated users only" ON "public"."answered_cases_subquestions" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Enable insert for authenticated users only" ON "public"."answered_questions" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Enable insert for authenticated users only" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Enable insert for authenticated users only" ON "public"."user_stats" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Enable read access for all users" ON "public"."answered_questions" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Enable read access for all users" ON "public"."cases_subquestions" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."chapters" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."courses" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."dragdrop_groups" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."dragdrop_pairs" FOR SELECT TO "authenticated" USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Enable read access for all users" ON "public"."leagues" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."multiple_choice_options" FOR SELECT TO "authenticated" USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Enable read access for all users" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "id"));



CREATE POLICY "Enable read access for all users" ON "public"."questions" FOR SELECT TO "authenticated" USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Enable read access for all users" ON "public"."subjects" FOR SELECT TO "authenticated" USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Enable read access for all users" ON "public"."user_stats" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Enable read access for authenticated users" ON "public"."answered_cases_subquestions" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Enable update for users based on email" ON "public"."answered_cases_subquestions" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Enable update for users based on email" ON "public"."answered_questions" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Enable update for users based on email" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Enable update for users based on email" ON "public"."user_stats" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Erlaube öffentlichen Zugriff auf sequence_items" ON "public"."sequence_items" USING (true) WITH CHECK (true);



CREATE POLICY "For all authenticated" ON "public"."levels" FOR SELECT TO "authenticated" USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Only service role can insert/update/delete" ON "public"."items" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Public read access to items" ON "public"."items" FOR SELECT USING (true);



CREATE POLICY "Public read access to league_positions" ON "public"."league_positions" FOR SELECT USING (true);



CREATE POLICY "Public read access to monthly_uni_scores" ON "public"."monthly_uni_scores" FOR SELECT USING (true);



CREATE POLICY "Public read access to shop_avatars" ON "public"."shop_avatars" FOR SELECT USING (true);



CREATE POLICY "Public read access to universities" ON "public"."universities" FOR SELECT USING (true);



CREATE POLICY "User can delete their own avatars" ON "public"."user_avatars" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "User can insert their own avatars" ON "public"."user_avatars" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "User can update own league_position" ON "public"."league_positions" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "User can update own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "User can update their own avatars" ON "public"."user_avatars" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "User can view their own avatars" ON "public"."user_avatars" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can read all profiles (e.g. for Leaderboard)" ON "public"."profiles" FOR SELECT USING (true);



ALTER TABLE "public"."answered_cases_subquestions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."answered_questions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cases_subquestions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."chapters" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."courses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."daily_streaks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."dragdrop_groups" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."dragdrop_pairs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "insert_own_daily_streak" ON "public"."daily_streaks" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "insert_own_medals" ON "public"."user_medals" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "insert_own_pvp_answers" ON "public"."pvp_answers" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "insert_own_streak" ON "public"."user_streaks" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."league_positions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."leagues" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."levels" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."match_participants" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."monthly_uni_scores" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."multiple_choice_options" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "own_participation" ON "public"."pvp_participants" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "own_responses" ON "public"."pvp_responses" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."pvp_answers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pvp_matches" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pvp_participants" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pvp_responses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."questions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "see_own_matches" ON "public"."pvp_matches" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."match_participants" "mp"
  WHERE (("mp"."match_id" = "pvp_matches"."id") AND ("mp"."user_id" = "auth"."uid"())))));



CREATE POLICY "see_own_participation" ON "public"."match_participants" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "see_own_pvp_answers" ON "public"."pvp_answers" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "select_own_answers" ON "public"."answered_questions" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "select_own_daily_streak" ON "public"."daily_streaks" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "select_own_items" ON "public"."user_items" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "select_own_medals" ON "public"."user_medals" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "select_own_streak" ON "public"."user_streaks" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."sequence_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."shop_avatars" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subjects" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."universities" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "update_own_daily_streak" ON "public"."daily_streaks" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "update_own_items" ON "public"."user_items" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "update_own_streak" ON "public"."user_streaks" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."user_avatars" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_medals" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_stats" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_streaks" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."apply_penalty_for_wrong_answers"("p_user_id" "uuid", "p_wrong_question_ids" bigint[]) TO "anon";
GRANT ALL ON FUNCTION "public"."apply_penalty_for_wrong_answers"("p_user_id" "uuid", "p_wrong_question_ids" bigint[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."apply_penalty_for_wrong_answers"("p_user_id" "uuid", "p_wrong_question_ids" bigint[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."assign_medals_on_completion"("p_user_id" "uuid", "p_chapter_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."assign_medals_on_completion"("p_user_id" "uuid", "p_chapter_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."assign_medals_on_completion"("p_user_id" "uuid", "p_chapter_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_and_award_xp"("question_ids" integer[], "subquestion_ids" integer[], "user_id_param" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_and_award_xp"("question_ids" integer[], "subquestion_ids" integer[], "user_id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_and_award_xp"("question_ids" integer[], "subquestion_ids" integer[], "user_id_param" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_and_award_xp"("user_id_param" "uuid", "question_ids" integer[], "subquestion_ids" integer[]) TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_and_award_xp"("user_id_param" "uuid", "question_ids" integer[], "subquestion_ids" integer[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_and_award_xp"("user_id_param" "uuid", "question_ids" integer[], "subquestion_ids" integer[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."check_answer"("p_question_id" integer, "p_answer" "text", "p_type" "text", "p_subquestion_id" integer, "p_is_correct" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."check_answer"("p_question_id" integer, "p_answer" "text", "p_type" "text", "p_subquestion_id" integer, "p_is_correct" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_answer"("p_question_id" integer, "p_answer" "text", "p_type" "text", "p_subquestion_id" integer, "p_is_correct" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."check_case_answers"("p_question_id" integer, "p_answers" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."check_case_answers"("p_question_id" integer, "p_answers" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_case_answers"("p_question_id" integer, "p_answers" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_dragdrop_group"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_dragdrop_group"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_dragdrop_group"() TO "service_role";



GRANT ALL ON FUNCTION "public"."finalize_pvp_match"("match_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."finalize_pvp_match"("match_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."finalize_pvp_match"("match_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_answer_stats"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_answer_stats"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_answer_stats"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_league_leaderboard"("league_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_league_leaderboard"("league_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_league_leaderboard"("league_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_player_leaderboard"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_player_leaderboard"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_player_leaderboard"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_quiz_summary"("p_user_id" "uuid", "p_chapter_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_quiz_summary"("p_user_id" "uuid", "p_chapter_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_quiz_summary"("p_user_id" "uuid", "p_chapter_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_streaks"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_streaks"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_streaks"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_subject_breakdown_for_user"("_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_subject_breakdown_for_user"("_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_subject_breakdown_for_user"("_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_university_contributors"("uni_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_university_contributors"("uni_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_university_contributors"("uni_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_university_leaderboard"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_university_leaderboard"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_university_leaderboard"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_items"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_items"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_items"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_progress"("chapter_id" integer, "user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_progress"("chapter_id" integer, "user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_progress"("chapter_id" integer, "user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_progress"("user_id" "uuid", "chapter_id" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_progress"("user_id" "uuid", "chapter_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_progress"("user_id" "uuid", "chapter_id" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_stats"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_stats"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_stats"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."has_answered"("user_id" "uuid", "question_id" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."has_answered"("user_id" "uuid", "question_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_answered"("user_id" "uuid", "question_id" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."is_quiz_completed"("user_id" "uuid", "chapter_id" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."is_quiz_completed"("user_id" "uuid", "chapter_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_quiz_completed"("user_id" "uuid", "chapter_id" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."purchase_item"("user_id" "uuid", "item_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."purchase_item"("user_id" "uuid", "item_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."purchase_item"("user_id" "uuid", "item_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."reset_leagues"() TO "anon";
GRANT ALL ON FUNCTION "public"."reset_leagues"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."reset_leagues"() TO "service_role";



GRANT ALL ON FUNCTION "public"."reset_uni_leaderboard"() TO "anon";
GRANT ALL ON FUNCTION "public"."reset_uni_leaderboard"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."reset_uni_leaderboard"() TO "service_role";



GRANT ALL ON FUNCTION "public"."start_pvp_match"("user_id" "uuid", "opponent_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."start_pvp_match"("user_id" "uuid", "opponent_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."start_pvp_match"("user_id" "uuid", "opponent_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."submit_answer"("p_user_id" "uuid", "p_question_id" integer, "p_answer" "text", "p_subquestion_id" integer, "p_streak_boost_active" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."submit_answer"("p_user_id" "uuid", "p_question_id" integer, "p_answer" "text", "p_subquestion_id" integer, "p_streak_boost_active" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."submit_answer"("p_user_id" "uuid", "p_question_id" integer, "p_answer" "text", "p_subquestion_id" integer, "p_streak_boost_active" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."submit_pvp_answer"("user_id" "uuid", "match_id" "uuid", "question_id" "uuid", "is_correct" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."submit_pvp_answer"("user_id" "uuid", "match_id" "uuid", "question_id" "uuid", "is_correct" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."submit_pvp_answer"("user_id" "uuid", "match_id" "uuid", "question_id" "uuid", "is_correct" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."submit_pvp_response"("user_id" "uuid", "match_id" "uuid", "question_id" bigint, "is_correct" boolean, "response_time_ms" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."submit_pvp_response"("user_id" "uuid", "match_id" "uuid", "question_id" bigint, "is_correct" boolean, "response_time_ms" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."submit_pvp_response"("user_id" "uuid", "match_id" "uuid", "question_id" bigint, "is_correct" boolean, "response_time_ms" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_daily_streak"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."update_daily_streak"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_daily_streak"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_league_groups"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_league_groups"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_league_groups"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_level_from_stats()"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_level_from_stats()"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_level_from_stats()"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_level_on_xp_change"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."update_level_on_xp_change"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_level_on_xp_change"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_match_score"("match_id" "uuid", "user_id" "uuid", "is_correct" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."update_match_score"("match_id" "uuid", "user_id" "uuid", "is_correct" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_match_score"("match_id" "uuid", "user_id" "uuid", "is_correct" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_streak"("user_id" "uuid", "is_correct" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."update_streak"("user_id" "uuid", "is_correct" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_streak"("user_id" "uuid", "is_correct" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_subquestions_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_subquestions_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_subquestions_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."use_item"("user_id" "uuid", "item_id" "uuid", "question_id" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."use_item"("user_id" "uuid", "item_id" "uuid", "question_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."use_item"("user_id" "uuid", "item_id" "uuid", "question_id" bigint) TO "service_role";



GRANT ALL ON TABLE "public"."answered_cases_subquestions" TO "anon";
GRANT ALL ON TABLE "public"."answered_cases_subquestions" TO "authenticated";
GRANT ALL ON TABLE "public"."answered_cases_subquestions" TO "service_role";



GRANT ALL ON SEQUENCE "public"."answered_cases_subquestions_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."answered_cases_subquestions_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."answered_cases_subquestions_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."answered_questions" TO "anon";
GRANT ALL ON TABLE "public"."answered_questions" TO "authenticated";
GRANT ALL ON TABLE "public"."answered_questions" TO "service_role";



GRANT ALL ON SEQUENCE "public"."answered_questions_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."answered_questions_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."answered_questions_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."cases_subquestions" TO "anon";
GRANT ALL ON TABLE "public"."cases_subquestions" TO "authenticated";
GRANT ALL ON TABLE "public"."cases_subquestions" TO "service_role";



GRANT ALL ON SEQUENCE "public"."cases_subquestions_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."cases_subquestions_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."cases_subquestions_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."chapters" TO "anon";
GRANT ALL ON TABLE "public"."chapters" TO "authenticated";
GRANT ALL ON TABLE "public"."chapters" TO "service_role";



GRANT ALL ON SEQUENCE "public"."chapters_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."chapters_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."chapters_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."courses" TO "anon";
GRANT ALL ON TABLE "public"."courses" TO "authenticated";
GRANT ALL ON TABLE "public"."courses" TO "service_role";



GRANT ALL ON SEQUENCE "public"."courses_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."courses_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."courses_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."daily_streaks" TO "anon";
GRANT ALL ON TABLE "public"."daily_streaks" TO "authenticated";
GRANT ALL ON TABLE "public"."daily_streaks" TO "service_role";



GRANT ALL ON TABLE "public"."dragdrop_groups" TO "anon";
GRANT ALL ON TABLE "public"."dragdrop_groups" TO "authenticated";
GRANT ALL ON TABLE "public"."dragdrop_groups" TO "service_role";



GRANT ALL ON SEQUENCE "public"."dragdrop_groups_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."dragdrop_groups_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."dragdrop_groups_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."dragdrop_pairs" TO "anon";
GRANT ALL ON TABLE "public"."dragdrop_pairs" TO "authenticated";
GRANT ALL ON TABLE "public"."dragdrop_pairs" TO "service_role";



GRANT ALL ON SEQUENCE "public"."dragdrop_pairs_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."dragdrop_pairs_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."dragdrop_pairs_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."item_usage_log" TO "anon";
GRANT ALL ON TABLE "public"."item_usage_log" TO "authenticated";
GRANT ALL ON TABLE "public"."item_usage_log" TO "service_role";



GRANT ALL ON SEQUENCE "public"."item_usage_log_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."item_usage_log_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."item_usage_log_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."items" TO "anon";
GRANT ALL ON TABLE "public"."items" TO "authenticated";
GRANT ALL ON TABLE "public"."items" TO "service_role";



GRANT ALL ON TABLE "public"."league_positions" TO "anon";
GRANT ALL ON TABLE "public"."league_positions" TO "authenticated";
GRANT ALL ON TABLE "public"."league_positions" TO "service_role";



GRANT ALL ON TABLE "public"."leagues" TO "anon";
GRANT ALL ON TABLE "public"."leagues" TO "authenticated";
GRANT ALL ON TABLE "public"."leagues" TO "service_role";



GRANT ALL ON SEQUENCE "public"."leagues_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."leagues_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."leagues_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."levels" TO "anon";
GRANT ALL ON TABLE "public"."levels" TO "authenticated";
GRANT ALL ON TABLE "public"."levels" TO "service_role";



GRANT ALL ON SEQUENCE "public"."levels_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."levels_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."levels_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."match_participants" TO "anon";
GRANT ALL ON TABLE "public"."match_participants" TO "authenticated";
GRANT ALL ON TABLE "public"."match_participants" TO "service_role";



GRANT ALL ON TABLE "public"."medals" TO "anon";
GRANT ALL ON TABLE "public"."medals" TO "authenticated";
GRANT ALL ON TABLE "public"."medals" TO "service_role";



GRANT ALL ON TABLE "public"."monthly_uni_scores" TO "anon";
GRANT ALL ON TABLE "public"."monthly_uni_scores" TO "authenticated";
GRANT ALL ON TABLE "public"."monthly_uni_scores" TO "service_role";



GRANT ALL ON SEQUENCE "public"."monthly_uni_scores_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."monthly_uni_scores_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."monthly_uni_scores_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."multiple_choice_options" TO "anon";
GRANT ALL ON TABLE "public"."multiple_choice_options" TO "authenticated";
GRANT ALL ON TABLE "public"."multiple_choice_options" TO "service_role";



GRANT ALL ON SEQUENCE "public"."multiple_choice_options_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."multiple_choice_options_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."multiple_choice_options_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."pvp_answers" TO "anon";
GRANT ALL ON TABLE "public"."pvp_answers" TO "authenticated";
GRANT ALL ON TABLE "public"."pvp_answers" TO "service_role";



GRANT ALL ON TABLE "public"."pvp_matches" TO "anon";
GRANT ALL ON TABLE "public"."pvp_matches" TO "authenticated";
GRANT ALL ON TABLE "public"."pvp_matches" TO "service_role";



GRANT ALL ON TABLE "public"."pvp_participants" TO "anon";
GRANT ALL ON TABLE "public"."pvp_participants" TO "authenticated";
GRANT ALL ON TABLE "public"."pvp_participants" TO "service_role";



GRANT ALL ON TABLE "public"."pvp_responses" TO "anon";
GRANT ALL ON TABLE "public"."pvp_responses" TO "authenticated";
GRANT ALL ON TABLE "public"."pvp_responses" TO "service_role";



GRANT ALL ON TABLE "public"."question_types" TO "anon";
GRANT ALL ON TABLE "public"."question_types" TO "authenticated";
GRANT ALL ON TABLE "public"."question_types" TO "service_role";



GRANT ALL ON TABLE "public"."questions" TO "anon";
GRANT ALL ON TABLE "public"."questions" TO "authenticated";
GRANT ALL ON TABLE "public"."questions" TO "service_role";



GRANT ALL ON SEQUENCE "public"."questions_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."questions_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."questions_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."quiz_progress" TO "anon";
GRANT ALL ON TABLE "public"."quiz_progress" TO "authenticated";
GRANT ALL ON TABLE "public"."quiz_progress" TO "service_role";



GRANT ALL ON SEQUENCE "public"."quiz_progress_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."quiz_progress_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."quiz_progress_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."sequence_items" TO "anon";
GRANT ALL ON TABLE "public"."sequence_items" TO "authenticated";
GRANT ALL ON TABLE "public"."sequence_items" TO "service_role";



GRANT ALL ON SEQUENCE "public"."sequence_items_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."sequence_items_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."sequence_items_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."shop_avatars" TO "anon";
GRANT ALL ON TABLE "public"."shop_avatars" TO "authenticated";
GRANT ALL ON TABLE "public"."shop_avatars" TO "service_role";



GRANT ALL ON SEQUENCE "public"."shop_avatars_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."shop_avatars_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."shop_avatars_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."subjects" TO "anon";
GRANT ALL ON TABLE "public"."subjects" TO "authenticated";
GRANT ALL ON TABLE "public"."subjects" TO "service_role";



GRANT ALL ON SEQUENCE "public"."subjects_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."subjects_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."subjects_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."universities" TO "anon";
GRANT ALL ON TABLE "public"."universities" TO "authenticated";
GRANT ALL ON TABLE "public"."universities" TO "service_role";



GRANT ALL ON SEQUENCE "public"."universities_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."universities_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."universities_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."user_avatars" TO "anon";
GRANT ALL ON TABLE "public"."user_avatars" TO "authenticated";
GRANT ALL ON TABLE "public"."user_avatars" TO "service_role";



GRANT ALL ON TABLE "public"."user_items" TO "anon";
GRANT ALL ON TABLE "public"."user_items" TO "authenticated";
GRANT ALL ON TABLE "public"."user_items" TO "service_role";



GRANT ALL ON TABLE "public"."user_medals" TO "anon";
GRANT ALL ON TABLE "public"."user_medals" TO "authenticated";
GRANT ALL ON TABLE "public"."user_medals" TO "service_role";



GRANT ALL ON TABLE "public"."user_stats" TO "anon";
GRANT ALL ON TABLE "public"."user_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."user_stats" TO "service_role";



GRANT ALL ON TABLE "public"."user_streaks" TO "anon";
GRANT ALL ON TABLE "public"."user_streaks" TO "authenticated";
GRANT ALL ON TABLE "public"."user_streaks" TO "service_role";



GRANT ALL ON TABLE "public"."versions" TO "anon";
GRANT ALL ON TABLE "public"."versions" TO "authenticated";
GRANT ALL ON TABLE "public"."versions" TO "service_role";



GRANT ALL ON SEQUENCE "public"."versions_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."versions_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."versions_id_seq" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






RESET ALL;
