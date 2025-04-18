-- File: apply_penalty_for_wrong_answers.sql
DROP FUNCTION IF EXISTS apply_penalty_for_wrong_answers(
    p_user_id UUID,
    p_wrong_question_ids BIGINT[]
);

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
