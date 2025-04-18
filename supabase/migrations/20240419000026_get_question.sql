-- Lösche alle existierenden Varianten der Funktion
DROP FUNCTION IF EXISTS public.get_question(INTEGER);
DROP FUNCTION IF EXISTS get_question(INTEGER);

CREATE OR REPLACE FUNCTION public.get_question(
    p_question_id INTEGER
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_question_exists BOOLEAN;
    v_question_type TEXT;
    v_result jsonb;
    v_answers jsonb;
BEGIN
    -- Prüfe ob Frage existiert
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

    -- Hole Antworten basierend auf dem Fragetyp
    CASE v_question_type
        WHEN 'multiple_choice' THEN
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', mco.id,
                    'text', mco.option_text,
                    'is_correct', mco.is_correct
                )
                ORDER BY mco.id
            )
            FROM multiple_choice_options mco
            WHERE mco.question_id = p_question_id
            INTO v_answers;

        WHEN 'drag_drop' THEN
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', dp.id,
                    'drag_text', dp.drag_text,
                    'correct_match', dp.correct_match,
                    'group_name', dg.group_name
                )
                ORDER BY dp.id
            )
            FROM dragdrop_pairs dp
            JOIN dragdrop_groups dg ON dp.group_id = dg.id
            WHERE dg.question_id = p_question_id
            INTO v_answers;

        WHEN 'case_question' THEN
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', cs.id,
                    'statement_text', cs.statement_text,
                    'explanation', cs.explanation
                )
                ORDER BY cs.id
            )
            FROM cases_subquestions cs
            WHERE cs.question_id = p_question_id
            INTO v_answers;

        ELSE
            -- Für einfache Fragen
            SELECT jsonb_build_array(
                jsonb_build_object(
                    'text', q."Richtige Antwort",
                    'is_correct', true
                )
            )
            FROM questions q
            WHERE q.id = p_question_id
            INTO v_answers;
    END CASE;

    -- Hole Frage mit allen Details
    SELECT jsonb_build_object(
        'success', true,
        'data', jsonb_build_object(
            'id', q.id,
            'text', q."Frage",
            'type', q.question_type,
            'subject', jsonb_build_object(
                'id', s.id,
                'name', s.name
            ),
            'question_type', jsonb_build_object(
                'id', qt.id_uuid,
                'name', qt.id,
                'base_xp', qt.base_xp
            ),
            'answers', COALESCE(v_answers, '[]'::jsonb),
            'explanation', q."Begruendung",
            'created_at', q.created_at,
            'updated_at', q.updated_at
        )
    )
    INTO v_result
    FROM questions q
    JOIN subjects s ON q.subject_id = s.id
    JOIN question_types qt ON q.question_type_id = qt.id_uuid
    WHERE q.id = p_question_id;

    RETURN v_result;

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'message', 'Ein Fehler ist aufgetreten',
        'error', SQLERRM
    );
END;
$$; 