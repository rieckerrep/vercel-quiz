-- File: calculate_and_award_xp.sql
DROP FUNCTION IF EXISTS public.calculate_and_award_xp(UUID, INTEGER, BOOLEAN);
DROP FUNCTION IF EXISTS public.calculate_and_award_xp(UUID, INTEGER);
DROP FUNCTION IF EXISTS calculate_and_award_xp(UUID, INTEGER, BOOLEAN);
DROP FUNCTION IF EXISTS calculate_and_award_xp(UUID, INTEGER);

CREATE OR REPLACE FUNCTION public.calculate_and_award_xp(
    p_user_id UUID,
    p_question_id INTEGER,
    p_is_correct BOOLEAN
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_base_xp INTEGER;
    v_streak_count INTEGER;
    v_final_xp INTEGER;
    v_error_message TEXT;
    v_question_type_id UUID;
    v_streak_multiplier FLOAT;
BEGIN
    -- Hole Basis-XP und Fragentyp
    SELECT qt.base_xp, q.question_type_id 
    INTO v_base_xp, v_question_type_id
    FROM questions q
    JOIN question_types qt ON q.question_type_id = qt.id
    WHERE q.id = p_question_id;

    -- Hole aktuelle Streak
    SELECT current_streak 
    INTO v_streak_count
    FROM user_streaks
    WHERE user_id = p_user_id;

    -- Berechne Streak-Multiplikator
    v_streak_multiplier := 1.0;
    IF v_streak_count >= 3 THEN
        v_streak_multiplier := 1.5; -- 50% Bonus bei 3+ Streak
    ELSIF v_streak_count >= 5 THEN
        v_streak_multiplier := 2.0; -- 100% Bonus bei 5+ Streak
    END IF;

    -- Berechne finales XP
    IF p_is_correct THEN
        v_final_xp := ROUND(v_base_xp * v_streak_multiplier);
    ELSE
        v_final_xp := 0;
    END IF;

    -- Aktualisiere user_stats
    UPDATE user_stats
    SET total_xp = total_xp + v_final_xp,
        last_updated = NOW()
    WHERE user_id = p_user_id;

    -- Erfolgsmeldung zurückgeben
    RETURN jsonb_build_object(
        'status', 'success',
        'base_xp', v_base_xp,
        'streak_count', v_streak_count,
        'streak_multiplier', v_streak_multiplier,
        'final_xp', v_final_xp
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
