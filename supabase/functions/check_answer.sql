-- File: check_answer.sql
DROP FUNCTION IF EXISTS check_answer(
    p_question_id INTEGER,
    p_answer TEXT,
    p_subquestion_id INTEGER DEFAULT NULL
);

CREATE OR REPLACE FUNCTION "public"."check_answer"("p_question_id" integer, "p_answer" "text", "p_type" "text", "p_subquestion_id" integer DEFAULT NULL::integer, "p_is_correct" boolean DEFAULT NULL::boolean) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_correct_answer TEXT;
    v_is_correct BOOLEAN;
    v_dragdrop_pair RECORD;
BEGIN
    CASE p_type
        WHEN 'question' THEN  -- Standard-Fragetyp
            SELECT "Richtige Antwort" INTO v_correct_answer
            FROM questions
            WHERE id = p_question_id;
            
            v_is_correct := LOWER(TRIM(p_answer)) = LOWER(TRIM(v_correct_answer));
            
        WHEN 'multiple_choice' THEN
            SELECT "Richtige Antwort" INTO v_correct_answer
            FROM questions
            WHERE id = p_question_id;
            
            v_is_correct := LOWER(TRIM(p_answer)) = LOWER(TRIM(v_correct_answer));
            
        WHEN 'true_false' THEN
            SELECT "Richtige Antwort" INTO v_correct_answer
            FROM questions
            WHERE id = p_question_id;
            
            v_is_correct := (
                (LOWER(TRIM(p_answer)) = 'true' AND LOWER(TRIM(v_correct_answer)) = 'true') OR
                (LOWER(TRIM(p_answer)) = 'false' AND LOWER(TRIM(v_correct_answer)) = 'false')
            );
            
        WHEN 'drag_drop' THEN
            -- Prüfe ob die Paarung existiert und korrekt ist
            SELECT EXISTS (
                SELECT 1 
                FROM dragdrop_pairs
                WHERE question_id = p_question_id
                    AND source_text = p_answer
                    AND target_text = p_subquestion_id::TEXT
            ) INTO v_is_correct;
                
        WHEN 'lueckentext' THEN
            SELECT "Richtige Antwort" INTO v_correct_answer
            FROM questions
            WHERE id = p_question_id;
            
            v_is_correct := LOWER(TRIM(p_answer)) = LOWER(TRIM(v_correct_answer));

        WHEN 'cases' THEN
            IF p_subquestion_id IS NULL THEN
                RAISE EXCEPTION 'Für Fallfragen muss eine Unterfrage-ID angegeben werden';
            END IF;
            
            SELECT correct_answer INTO v_correct_answer
            FROM cases_subquestions
            WHERE id = p_subquestion_id;
            
            v_is_correct := LOWER(TRIM(p_answer)) = LOWER(TRIM(v_correct_answer));
            
        WHEN 'open_question' THEN
            -- Bei offenen Fragen entscheidet der Nutzer selbst
            IF p_is_correct IS NULL THEN
                RAISE EXCEPTION 'Bei offenen Fragen muss p_is_correct angegeben werden';
            END IF;
            
            v_is_correct := p_is_correct;
            
        ELSE
            v_is_correct := false;
    END CASE;
    
    RETURN v_is_correct;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Fehler bei der Antwortprüfung: %', SQLERRM;
END;
$$;
