-- File: check_case_answers.sql
DROP FUNCTION IF EXISTS check_case_answers(
    p_question_id INTEGER,
    p_answers TEXT[]
);

CREATE OR REPLACE FUNCTION "public"."check_case_answers"("p_question_id" integer, "p_answers" text[]) RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_result jsonb;
  v_subquestion record;
  v_is_correct boolean;
BEGIN
  v_result := '[]'::jsonb;
  
  FOR v_subquestion IN 
    SELECT id, correct_answer, statement_text
    FROM cases_subquestions
    WHERE question_id = p_question_id
  LOOP
    SELECT (jsonb_array_elements(p_answers)->>'answer')::text = v_subquestion.correct_answer
    INTO v_is_correct
    WHERE (jsonb_array_elements(p_answers)->>'subquestion_id')::integer = v_subquestion.id;
    
    v_result := v_result || jsonb_build_object(
      'subquestion_id', v_subquestion.id,
      'statement_text', v_subquestion.statement_text,
      'is_correct', COALESCE(v_is_correct, false)
    );
  END LOOP;
  
  RETURN v_result;
END;
$$;
