-- Erstelle die get_user_progress Funktion
CREATE OR REPLACE FUNCTION get_user_progress(
  chapter_id INTEGER,
  user_id UUID
)
RETURNS TABLE (
  question_id INTEGER,
  is_answered BOOLEAN,
  is_correct BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
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