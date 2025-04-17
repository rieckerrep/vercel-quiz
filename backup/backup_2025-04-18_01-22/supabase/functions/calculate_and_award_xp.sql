-- File: calculate_and_award_xp.sql
DROP FUNCTION IF EXISTS calculate_and_award_xp(
    p_user_id UUID,
    p_question_id INTEGER,
    p_is_correct BOOLEAN
);

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
-- File: calculate_and_award_xp.sql
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
