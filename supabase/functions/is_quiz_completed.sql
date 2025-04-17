-- File: is_quiz_completed.sql
DROP FUNCTION IF EXISTS is_quiz_completed(
    p_user_id UUID,
    p_chapter_id UUID
);

CREATE OR REPLACE FUNCTION "public"."is_quiz_completed"("p_user_id" uuid, "p_chapter_id" uuid) RETURNS boolean
    LANGUAGE "sql"
    AS $$
  SELECT COUNT(DISTINCT aq.question_id) = COUNT(q.id)
  FROM questions q
  LEFT JOIN answered_questions aq
    ON q.id = aq.question_id AND aq.user_id = is_quiz_completed.p_user_id
  WHERE q.chapter_id = is_quiz_completed.p_chapter_id;
$$;
