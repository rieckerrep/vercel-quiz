-- File: get_user_progress.sql
DROP FUNCTION IF EXISTS get_user_progress(
    p_user_id UUID
);

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
-- File: get_user_progress.sql
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
