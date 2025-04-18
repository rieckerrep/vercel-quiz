-- File: get_streaks.sql
DROP FUNCTION IF EXISTS public.get_streaks(UUID);
DROP FUNCTION IF EXISTS get_streaks(UUID);

CREATE OR REPLACE FUNCTION public.get_streaks(
    p_user_id UUID
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_quiz_streak INTEGER;
    v_quiz_max_streak INTEGER;
    v_daily_streak INTEGER;
    v_daily_max_streak INTEGER;
    v_last_quiz_update TIMESTAMP;
    v_last_daily_active DATE;
    v_error_message TEXT;
    v_streak_status TEXT;
    v_berlin_today DATE;
BEGIN
    -- Setze Zeitzone auf Berlin
    v_berlin_today := timezone('Europe/Berlin', now())::DATE;

    -- Hole Quiz-Streak Informationen
    SELECT 
        current_streak,
        max_streak,
        last_updated
    INTO 
        v_quiz_streak,
        v_quiz_max_streak,
        v_last_quiz_update
    FROM user_streaks
    WHERE user_id = p_user_id;

    -- Hole Daily-Streak Informationen
    SELECT 
        current_streak,
        max_streak,
        last_active_date
    INTO 
        v_daily_streak,
        v_daily_max_streak,
        v_last_daily_active
    FROM daily_streaks
    WHERE user_id = p_user_id;

    -- Bestimme Streak-Status
    IF v_last_daily_active = v_berlin_today THEN
        v_streak_status := 'active_today';
    ELSIF v_last_daily_active = v_berlin_today - INTERVAL '1 day' THEN
        v_streak_status := 'active_yesterday';
    ELSE
        v_streak_status := 'inactive';
    END IF;

    -- Rückgabe der Streak-Informationen
    RETURN jsonb_build_object(
        'status', 'success',
        'quiz_streak', jsonb_build_object(
            'current_streak', COALESCE(v_quiz_streak, 0),
            'max_streak', COALESCE(v_quiz_max_streak, 0),
            'last_updated', v_last_quiz_update,
            'hours_since_last_quiz', 
                CASE 
                    WHEN v_last_quiz_update IS NOT NULL 
                    THEN EXTRACT(EPOCH FROM (NOW() - v_last_quiz_update))/3600 
                    ELSE NULL 
                END
        ),
        'daily_streak', jsonb_build_object(
            'current_streak', COALESCE(v_daily_streak, 0),
            'max_streak', COALESCE(v_daily_max_streak, 0),
            'last_active_date', v_last_daily_active,
            'streak_status', v_streak_status,
            'can_continue_streak', (v_last_daily_active = v_berlin_today - INTERVAL '1 day')
        ),
        'rewards', jsonb_build_object(
            'quiz_streak_bonus', 
                CASE
                    WHEN COALESCE(v_quiz_streak, 0) >= 5 THEN 50
                    WHEN COALESCE(v_quiz_streak, 0) >= 3 THEN 30
                    ELSE 0
                END,
            'daily_streak_bonus',
                CASE
                    WHEN COALESCE(v_daily_streak, 0) >= 7 THEN 100
                    WHEN COALESCE(v_daily_streak, 0) >= 3 THEN 50
                    ELSE 25
                END
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
