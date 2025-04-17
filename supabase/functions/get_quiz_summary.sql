-- File: get_quiz_summary.sql
DROP FUNCTION IF EXISTS get_quiz_summary(
    p_user_id UUID,
    p_chapter_id UUID
);

CREATE OR REPLACE FUNCTION "public"."get_quiz_summary"("p_user_id" uuid, "p_chapter_id" uuid) RETURNS TABLE("xp_gained" integer, "xp_possible" integer)
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
