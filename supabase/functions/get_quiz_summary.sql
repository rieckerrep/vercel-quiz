-- File: get_quiz_summary.sql
DROP FUNCTION IF EXISTS public.get_quiz_summary(UUID, UUID);
DROP FUNCTION IF EXISTS get_quiz_summary(UUID, UUID);

CREATE OR REPLACE FUNCTION public.get_quiz_summary(
    p_user_id UUID,
    p_chapter_id UUID
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_questions INTEGER;
    v_answered_questions INTEGER;
    v_correct_answers INTEGER;
    v_total_xp_possible INTEGER;
    v_total_xp_earned INTEGER;
    v_error_message TEXT;
    v_chapter_name TEXT;
    v_completion_percentage INTEGER;
    v_accuracy_percentage INTEGER;
    v_last_attempt TIMESTAMP;
BEGIN
    -- Hole Kapitel-Informationen
    SELECT name INTO v_chapter_name
    FROM chapters
    WHERE id = p_chapter_id;

    IF v_chapter_name IS NULL THEN
        RETURN jsonb_build_object(
            'status', 'error',
            'message', 'Kapitel nicht gefunden'
        );
    END IF;

    -- Zähle Gesamtfragen und mögliche XP
    SELECT 
        COUNT(*),
        COALESCE(SUM(qt.base_xp), 0)
    INTO 
        v_total_questions,
        v_total_xp_possible
    FROM questions q
    JOIN question_types qt ON q.question_type_id = qt.id
    WHERE q.chapter_id = p_chapter_id;

    -- Hole Antwortstatistiken
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE is_correct = true),
        COALESCE(SUM(CASE WHEN is_correct THEN xp_awarded ELSE 0 END), 0),
        MAX(answered_at)
    INTO 
        v_answered_questions,
        v_correct_answers,
        v_total_xp_earned,
        v_last_attempt
    FROM answered_questions
    WHERE user_id = p_user_id 
    AND chapter_id = p_chapter_id;

    -- Berechne Prozentsätze
    IF v_total_questions > 0 THEN
        v_completion_percentage := ROUND((v_answered_questions::FLOAT / v_total_questions) * 100);
        IF v_answered_questions > 0 THEN
            v_accuracy_percentage := ROUND((v_correct_answers::FLOAT / v_answered_questions) * 100);
        ELSE
            v_accuracy_percentage := 0;
        END IF;
    ELSE
        v_completion_percentage := 0;
        v_accuracy_percentage := 0;
    END IF;

    -- Rückgabe der Zusammenfassung
    RETURN jsonb_build_object(
        'status', 'success',
        'summary', jsonb_build_object(
            'chapter_name', v_chapter_name,
            'questions', jsonb_build_object(
                'total', v_total_questions,
                'answered', v_answered_questions,
                'correct', v_correct_answers,
                'remaining', v_total_questions - v_answered_questions
            ),
            'progress', jsonb_build_object(
                'completion_percentage', v_completion_percentage,
                'accuracy_percentage', v_accuracy_percentage
            ),
            'xp', jsonb_build_object(
                'possible', v_total_xp_possible,
                'earned', v_total_xp_earned,
                'remaining', v_total_xp_possible - v_total_xp_earned
            ),
            'last_attempt', v_last_attempt,
            'is_completed', (v_completion_percentage = 100)
        )
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
