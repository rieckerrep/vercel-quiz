-- Drop alle existierenden Versionen der Funktion
DROP FUNCTION IF EXISTS public.calculate_and_award_xp(UUID, BIGINT[], BIGINT[]);
DROP FUNCTION IF EXISTS public.calculate_and_award_xp(INTEGER[], INTEGER[], UUID);
DROP FUNCTION IF EXISTS public.calculate_and_award_xp(question_ids INTEGER[], subquestion_ids INTEGER[], user_id_param UUID);

-- Erstelle die Funktion neu
CREATE OR REPLACE FUNCTION public.calculate_and_award_xp(
  question_ids INTEGER[],
  subquestion_ids INTEGER[],
  user_id_param UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
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