-- File: has_answered.sql
DROP FUNCTION IF EXISTS has_answered(
    p_user_id UUID,
    p_question_id INTEGER
);

CREATE OR REPLACE FUNCTION "public"."has_answered"("p_user_id" uuid, "p_question_id" integer) RETURNS boolean
    LANGUAGE "sql"
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM answered_questions
    WHERE user_id = has_answered.p_user_id
      AND question_id = has_answered.p_question_id
  );
$$;
