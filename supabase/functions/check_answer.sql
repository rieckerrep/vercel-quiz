-- File: check_answer.sql
DROP FUNCTION IF EXISTS public.check_answer(INTEGER, TEXT, TEXT, INTEGER, BOOLEAN);
DROP FUNCTION IF EXISTS public.check_answer(INTEGER, TEXT, TEXT, INTEGER);
DROP FUNCTION IF EXISTS public.check_answer(INTEGER, TEXT, TEXT);
DROP FUNCTION IF EXISTS check_answer(INTEGER, TEXT, TEXT, INTEGER, BOOLEAN);
DROP FUNCTION IF EXISTS check_answer(INTEGER, TEXT, TEXT, INTEGER);
DROP FUNCTION IF EXISTS check_answer(INTEGER, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.check_answer(
    p_question_id INTEGER,
    p_answer TEXT,
    p_type TEXT,
    p_subquestion_id INTEGER DEFAULT NULL,
    p_is_correct BOOLEAN DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_is_correct BOOLEAN;
    v_error_message TEXT;
    v_question_type_id UUID;
    v_correct_answer TEXT;
    v_explanation TEXT;
    v_feedback TEXT;
BEGIN
    -- Hole Fragentyp
    SELECT question_type_id INTO v_question_type_id
    FROM questions
    WHERE id = p_question_id;

    -- Prüfe Antwort basierend auf Fragentyp
    CASE p_type
        WHEN 'multiple_choice' THEN
            -- Prüfe Multiple-Choice-Antwort
            SELECT 
                CASE WHEN mo.is_correct THEN true ELSE false END,
                mo.explanation,
                mo.feedback
            INTO v_is_correct, v_explanation, v_feedback
            FROM multiple_choice_options mo
            WHERE mo.question_id = p_question_id 
            AND mo.option_text = p_answer;

        WHEN 'case' THEN
            -- Prüfe Fallfrage
            IF p_subquestion_id IS NULL THEN
                RETURN jsonb_build_object(
                    'error', 'Subquestion ID ist erforderlich für Fallfragen',
                    'status', 'error'
                );
            END IF;

            SELECT 
                CASE WHEN cs.correct_answer = p_answer THEN true ELSE false END,
                cs.explanation,
                cs.feedback
            INTO v_is_correct, v_explanation, v_feedback
            FROM cases_subquestions cs
            WHERE cs.id = p_subquestion_id;

        WHEN 'dragdrop' THEN
            -- Prüfe Drag&Drop-Antwort
            SELECT 
                CASE WHEN dp.correct_pair = p_answer THEN true ELSE false END,
                dp.explanation,
                dp.feedback
            INTO v_is_correct, v_explanation, v_feedback
            FROM dragdrop_pairs dp
            WHERE dp.question_id = p_question_id;

        WHEN 'sequence' THEN
            -- Prüfe Sequenz-Antwort
            SELECT 
                CASE WHEN si.correct_sequence = p_answer THEN true ELSE false END,
                si.explanation,
                si.feedback
            INTO v_is_correct, v_explanation, v_feedback
            FROM sequence_items si
            WHERE si.question_id = p_question_id;

        ELSE
            -- Standard Text-Antwort
            SELECT 
                CASE WHEN q.correct_answer = p_answer THEN true ELSE false END,
                q.explanation,
                q.feedback
            INTO v_is_correct, v_explanation, v_feedback
            FROM questions q
            WHERE q.id = p_question_id;
    END CASE;

    -- Wenn keine Antwort gefunden wurde
    IF v_is_correct IS NULL THEN
        RETURN jsonb_build_object(
            'error', 'Keine gültige Antwort gefunden',
            'status', 'error'
        );
    END IF;

    -- Erfolgsmeldung zurückgeben
    RETURN jsonb_build_object(
        'status', 'success',
        'is_correct', v_is_correct,
        'explanation', v_explanation,
        'feedback', v_feedback
    );

EXCEPTION
    WHEN OTHERS THEN
        v_error_message := SQLERRM;
        RETURN jsonb_build_object(
            'error', v_error_message,
            'status', 'error'
        );
END;
$$;
