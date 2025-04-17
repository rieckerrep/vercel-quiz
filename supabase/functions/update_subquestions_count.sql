-- File: update_subquestions_count.sql
CREATE OR REPLACE FUNCTION "public"."update_subquestions_count"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE questions
  SET subquestions_count = (
    SELECT COUNT(*) FROM cases_subquestions WHERE question_id = NEW.question_id
  )
  WHERE id = NEW.question_id;
  RETURN NEW;
END;
$$;
