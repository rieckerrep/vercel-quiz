-- Lösche alle existierenden Varianten der Funktion
DROP FUNCTION IF EXISTS public.check_answer(UUID, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS check_answer(UUID, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION public.check_answer(
    p_user_id UUID,
    p_question_id INTEGER,
    p_answer_text TEXT
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_exists BOOLEAN;
    v_question_exists BOOLEAN;
    v_question_type TEXT;
    v_is_correct BOOLEAN;
    v_result jsonb;
BEGIN
    -- Prüfe ob Benutzer existiert
    SELECT EXISTS (
        SELECT 1 FROM profiles WHERE id = p_user_id
    ) INTO v_user_exists;

    IF NOT v_user_exists THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Benutzer nicht gefunden',
            'error', format('Benutzer mit ID %s existiert nicht', p_user_id)
        );
    END IF;

    -- Prüfe ob Frage existiert und hole den Typ
    SELECT EXISTS (
        SELECT 1 FROM questions WHERE id = p_question_id
    ), 
    (SELECT question_type FROM questions WHERE id = p_question_id)
    INTO v_question_exists, v_question_type;

    IF NOT v_question_exists THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Frage nicht gefunden',
            'error', format('Frage mit ID %s existiert nicht', p_question_id)
        );
    END IF;

    -- Prüfe Antwort basierend auf dem Fragetyp
    CASE v_question_type
        WHEN 'multiple_choice' THEN
            SELECT EXISTS (
                SELECT 1 
                FROM multiple_choice_options 
                WHERE question_id = p_question_id 
                AND option_text = p_answer_text
                AND is_correct = true
            ) INTO v_is_correct;

        WHEN 'drag_drop' THEN
            SELECT EXISTS (
                SELECT 1 
                FROM dragdrop_pairs dp
                JOIN dragdrop_groups dg ON dp.group_id = dg.id
                WHERE dg.question_id = p_question_id 
                AND dp.drag_text = p_answer_text
                AND dp.correct_match IS NOT NULL
            ) INTO v_is_correct;

        WHEN 'case_question' THEN
            SELECT EXISTS (
                SELECT 1 
                FROM cases_subquestions 
                WHERE question_id = p_question_id 
                AND correct_answer = p_answer_text
            ) INTO v_is_correct;

        ELSE
            -- Für einfache Fragen mit direkter Antwort
            SELECT "Richtige Antwort" = p_answer_text
            FROM questions 
            WHERE id = p_question_id
            INTO v_is_correct;
    END CASE;

    -- Erstelle Rückgabe-Objekt
    SELECT jsonb_build_object(
        'success', true,
        'data', jsonb_build_object(
            'is_correct', COALESCE(v_is_correct, false),
            'question_id', p_question_id,
            'question_type', v_question_type,
            'given_answer', p_answer_text
        )
    ) INTO v_result;

    RETURN v_result;

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'message', 'Ein Fehler ist aufgetreten',
        'error', SQLERRM
    );
END;
$$; 