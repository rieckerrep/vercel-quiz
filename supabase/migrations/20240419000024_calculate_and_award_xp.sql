-- Lösche alle existierenden Varianten der Funktion
DROP FUNCTION IF EXISTS public.calculate_and_award_xp(UUID, INTEGER, BOOLEAN);
DROP FUNCTION IF EXISTS calculate_and_award_xp(UUID, INTEGER, BOOLEAN);

CREATE OR REPLACE FUNCTION public.calculate_and_award_xp(
    p_user_id UUID,
    p_question_id INTEGER,
    p_is_correct BOOLEAN
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_exists BOOLEAN;
    v_question_exists BOOLEAN;
    v_base_xp INTEGER;
    v_streak_count INTEGER;
    v_final_xp INTEGER;
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

    -- Prüfe ob Frage existiert
    SELECT EXISTS (
        SELECT 1 FROM questions WHERE id = p_question_id
    ) INTO v_question_exists;

    IF NOT v_question_exists THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Frage nicht gefunden',
            'error', format('Frage mit ID %s existiert nicht', p_question_id)
        );
    END IF;

    -- Hole Basis-XP und Streak
    SELECT 
        qt.base_xp,
        COALESCE(us.current_streak, 0)
    INTO 
        v_base_xp,
        v_streak_count
    FROM questions q
    JOIN question_types qt ON q.question_type_id = qt.id
    LEFT JOIN user_streaks us ON us.user_id = p_user_id
    WHERE q.id = p_question_id;

    -- Berechne finale XP
    IF p_is_correct THEN
        v_final_xp := v_base_xp * (1 + (v_streak_count * 0.1));
    ELSE
        v_final_xp := 0;
    END IF;

    -- Aktualisiere XP in der Datenbank
    INSERT INTO user_stats (user_id, total_xp)
    VALUES (p_user_id, v_final_xp)
    ON CONFLICT (user_id) DO UPDATE SET
        total_xp = user_stats.total_xp + v_final_xp;

    -- Erstelle Rückgabe-Objekt
    SELECT jsonb_build_object(
        'success', true,
        'data', jsonb_build_object(
            'base_xp', v_base_xp,
            'streak_count', v_streak_count,
            'final_xp', v_final_xp,
            'is_correct', p_is_correct
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