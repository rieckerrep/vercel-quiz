-- File: get_answer_stats.sql
DROP FUNCTION IF EXISTS get_answer_stats(
    p_question_id INTEGER
);

CREATE OR REPLACE FUNCTION "public"."get_answer_stats"("user_id" "uuid") RETURNS TABLE("subject_name" "text", "correct_answers" integer)
    LANGUAGE "sql"
    AS $$
  SELECT
    s.name AS subject_name,
    COUNT(*) AS correct_answers
  FROM answered_questions aq
  JOIN questions q ON aq.question_id = q.id
  JOIN courses c ON q.course_id = c.id
  JOIN subjects s ON c.subject_id = s.id
  WHERE aq.user_id = get_answer_stats.user_id
    AND aq.is_correct = TRUE
  GROUP BY s.name
  ORDER BY correct_answers DESC;
$$;
