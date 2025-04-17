-- File: assign_medals_on_completion.sql
DROP FUNCTION IF EXISTS assign_medals_on_completion(
    p_user_id UUID,
    p_chapter_id UUID
);

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
