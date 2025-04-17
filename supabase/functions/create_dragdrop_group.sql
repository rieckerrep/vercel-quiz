-- File: create_dragdrop_group.sql
DROP FUNCTION IF EXISTS create_dragdrop_group(
    p_question_id INTEGER,
    p_group_name TEXT
);

CREATE OR REPLACE FUNCTION "public"."create_dragdrop_group"("p_question_id" integer, "p_group_name" text) RETURNS void
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  INSERT INTO dragdrop_groups (question_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$;
