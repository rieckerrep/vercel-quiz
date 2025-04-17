-- File: get_subject_breakdown_for_user.sql
DROP FUNCTION IF EXISTS get_subject_breakdown_for_user(
    p_user_id UUID
);

CREATE OR REPLACE FUNCTION "public"."get_subject_breakdown_for_user"("p_user_id" uuid) RETURNS TABLE("subject_name" "text", "correct_count" integer, "wrong_count" integer, "total" integer, "correct_percent" integer)
    LANGUAGE "sql" STABLE
    AS $$
  SELECT
    s.name AS subject_name,
    SUM(CASE WHEN aq.is_correct THEN 1 ELSE 0 END) AS correct_count,
    SUM(CASE WHEN aq.is_correct THEN 0 ELSE 1 END) AS wrong_count,
    COUNT(*) AS total,
    ROUND( (SUM(CASE WHEN aq.is_correct THEN 1 ELSE 0 END)::decimal / COUNT(*) * 100) )::int AS correct_percent
  FROM answered_questions aq
  JOIN questions q
    ON q.id = aq.question_id
  JOIN chapters ch
    ON ch.id = q.chapter_id
  JOIN courses co
    ON co.id = ch.course_id
  JOIN subjects s
    ON s.id = co.subject_id
  WHERE aq.user_id = p_user_id
  GROUP BY s.name
  ORDER BY s.name;
$$;
