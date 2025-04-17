-- Erstelle die calculate_and_award_xp Funktion
DROP FUNCTION IF EXISTS public.calculate_and_award_xp(UUID, BIGINT[], BIGINT[]);
DROP FUNCTION IF EXISTS public.calculate_and_award_xp(question_ids INTEGER[], subquestion_ids INTEGER[], user_id_param UUID);

CREATE OR REPLACE FUNCTION public.calculate_and_award_xp(
  p_user_id UUID,
  p_correct_question_ids BIGINT[],
  p_correct_subquestion_ids BIGINT[]
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_question_ids BIGINT[];
  v_new_subquestion_ids BIGINT[];
  v_total_xp INTEGER := 0;
  v_total_coins INTEGER := 0;
  v_total_correct INTEGER := 0;
BEGIN
  -- Normale Fragen: nur solche mit XP/Coins laut Typentabelle
  SELECT ARRAY_AGG(q.id)
  INTO v_new_question_ids
  FROM questions q
  JOIN question_types qt ON q.question_type_id = qt.id
  WHERE q.id = ANY(p_correct_question_ids)
    AND (qt.base_xp > 0 OR qt.base_coins > 0)
    AND NOT EXISTS (
      SELECT 1 FROM answered_questions aq
      WHERE aq.user_id = p_user_id AND aq.question_id = q.id
    );

  -- XP/Coins aus normalen Fragen berechnen
  IF v_new_question_ids IS NOT NULL THEN
    SELECT
      COALESCE(SUM(qt.base_xp), 0),
      COALESCE(SUM(qt.base_coins), 0),
      COUNT(*)
    INTO v_total_xp, v_total_coins, v_total_correct
    FROM questions q
    JOIN question_types qt ON q.question_type_id = qt.id
    WHERE q.id = ANY(v_new_question_ids);
  END IF;

  -- Subfragen: feste 5 XP pro korrekt beantworteter Subfrage
  SELECT ARRAY_AGG(cs.id)
  INTO v_new_subquestion_ids
  FROM cases_subquestions cs
  WHERE cs.id = ANY(p_correct_subquestion_ids)
    AND NOT EXISTS (
      SELECT 1 FROM answered_questions aq
      WHERE aq.user_id = p_user_id AND aq.question_id = cs.id
    );

  IF v_new_subquestion_ids IS NOT NULL THEN
    v_total_xp := v_total_xp + array_length(v_new_subquestion_ids, 1) * 5;
    v_total_correct := v_total_correct + array_length(v_new_subquestion_ids, 1);
    -- Coins für Subfragen? → aktuell: 0
  END IF;

  -- Eintragen beantworteter Fragen
  IF v_new_question_ids IS NOT NULL THEN
    INSERT INTO answered_questions (user_id, question_id, is_correct, answered_at)
    SELECT p_user_id, unnest(v_new_question_ids), TRUE, NOW();
  END IF;

  IF v_new_subquestion_ids IS NOT NULL THEN
    INSERT INTO answered_questions (user_id, question_id, is_correct, answered_at)
    SELECT p_user_id, unnest(v_new_subquestion_ids), TRUE, NOW();
  END IF;

  -- Stats aktualisieren
  UPDATE user_stats
  SET total_xp = total_xp + v_total_xp,
      total_coins = total_coins + v_total_coins,
      correct_answers = correct_answers + v_total_correct,
      questions_answered = questions_answered + v_total_correct
  WHERE user_id = p_user_id;

  -- Folgeaktionen
  PERFORM update_level_on_xp_change(p_user_id);
  PERFORM update_streak(p_user_id, TRUE);
  PERFORM update_daily_streak(p_user_id);

  RETURN '✅ ' || v_total_xp || ' XP und ' || v_total_coins || ' Coins für ' || v_total_correct || ' Antworten vergeben.';
END;
$$; 