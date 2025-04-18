-- File: get_user_progress.sql
DROP FUNCTION IF EXISTS public.get_user_progress(UUID, INTEGER);
DROP FUNCTION IF EXISTS public.get_user_progress(INTEGER, UUID);
DROP FUNCTION IF EXISTS get_user_progress(UUID, INTEGER);
DROP FUNCTION IF EXISTS get_user_progress(INTEGER, UUID);

CREATE OR REPLACE FUNCTION public.get_user_progress(
    p_user_id UUID,
    p_chapter_id INTEGER
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_questions INTEGER;
    v_answered_correct INTEGER;
    v_answered_total INTEGER;
    v_progress INTEGER;
    v_error_message TEXT;
    v_chapter_name TEXT;
    v_last_answered TIMESTAMP;
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

    -- Zähle Gesamtanzahl der Fragen im Kapitel
    SELECT COUNT(*) INTO v_total_questions
    FROM questions
    WHERE chapter_id = p_chapter_id;

    -- Hole Antwort-Statistiken
    SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE is_correct = true) as correct,
        MAX(answered_at) as last_answered
    INTO v_answered_total, v_answered_correct, v_last_answered
    FROM answered_questions
    WHERE user_id = p_user_id 
    AND chapter_id = p_chapter_id;

    -- Berechne Fortschritt in Prozent
    IF v_total_questions > 0 THEN
        v_progress := ROUND((v_answered_correct::FLOAT / v_total_questions) * 100);
    ELSE
        v_progress := 0;
    END IF;

    -- Aktualisiere quiz_progress
    INSERT INTO quiz_progress (
        user_id,
        chapter_id,
        progress,
        updated_at
    ) VALUES (
        p_user_id,
        p_chapter_id,
        v_progress,
        NOW()
    )
    ON CONFLICT (user_id, chapter_id)
    DO UPDATE SET
        progress = v_progress,
        updated_at = NOW();

    -- Rückgabe der Fortschrittsdaten
    RETURN jsonb_build_object(
        'status', 'success',
        'chapter_name', v_chapter_name,
        'total_questions', v_total_questions,
        'answered_total', v_answered_total,
        'answered_correct', v_answered_correct,
        'progress_percent', v_progress,
        'last_answered', v_last_answered,
        'is_completed', (v_progress = 100),
        'remaining_questions', (v_total_questions - v_answered_total)
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
