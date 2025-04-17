-- File: submit_pvp_answer.sql
DROP FUNCTION IF EXISTS submit_pvp_answer(
    p_match_id UUID,
    p_user_id UUID,
    p_question_id INTEGER,
    p_answer TEXT
);

CREATE OR REPLACE FUNCTION "public"."submit_pvp_answer"("p_match_id" uuid, "p_user_id" uuid, "p_question_id" integer, "p_answer" text) RETURNS jsonb
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  already_answered INTEGER;
BEGIN
  -- Prüfen, ob Frage schon beantwortet wurde (Anti-Farming)
  SELECT COUNT(*) INTO already_answered
  FROM pvp_answers
  WHERE user_id = p_user_id
    AND match_id = p_match_id
    AND question_id = p_question_id;

  IF already_answered > 0 THEN
    RETURN jsonb_build_object('status', '🚫 Frage bereits beantwortet');
  END IF;

  -- Antwort eintragen
  INSERT INTO pvp_answers (user_id, match_id, question_id, is_correct)
  VALUES (p_user_id, p_match_id, p_question_id, p_answer = 'correct');

  -- Punkte vergeben bei richtiger Antwort
  IF p_answer = 'correct' THEN
    UPDATE match_participants
    SET score = score + 10
    WHERE user_id = p_user_id AND match_id = p_match_id;
  END IF;

  RETURN jsonb_build_object('status', '✅ Antwort gespeichert');
END;
$$;
