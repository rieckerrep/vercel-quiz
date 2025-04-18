-- File: get_user_stats.sql
DROP FUNCTION IF EXISTS public.get_user_stats(UUID);
DROP FUNCTION IF EXISTS get_user_stats(UUID);

CREATE OR REPLACE FUNCTION public.get_user_stats(
    p_user_id UUID
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_xp INTEGER;
    v_total_coins INTEGER;
    v_current_level INTEGER;
    v_level_title TEXT;
    v_next_level_xp INTEGER;
    v_bronze_count INTEGER;
    v_silver_count INTEGER;
    v_gold_count INTEGER;
    v_quiz_streak INTEGER;
    v_daily_streak INTEGER;
    v_error_message TEXT;
    v_progress_to_next_level INTEGER;
BEGIN
    -- Hole Basis-Statistiken
    SELECT 
        total_xp,
        total_coins,
        level,
        level_title
    INTO 
        v_total_xp,
        v_total_coins,
        v_current_level,
        v_level_title
    FROM user_stats us
    LEFT JOIN levels l ON us.level = l.level
    WHERE user_id = p_user_id;

    -- Hole XP für nächstes Level
    SELECT xp_required 
    INTO v_next_level_xp
    FROM levels 
    WHERE level = v_current_level + 1;

    -- Berechne Fortschritt zum nächsten Level
    IF v_next_level_xp IS NOT NULL THEN
        v_progress_to_next_level := ROUND(
            ((v_total_xp - (SELECT xp_required FROM levels WHERE level = v_current_level))::FLOAT / 
            (v_next_level_xp - (SELECT xp_required FROM levels WHERE level = v_current_level))) * 100
        );
    ELSE
        v_progress_to_next_level := 100;
    END IF;

    -- Zähle Medaillen
    SELECT 
        COUNT(*) FILTER (WHERE medal = 'bronze'),
        COUNT(*) FILTER (WHERE medal = 'silver'),
        COUNT(*) FILTER (WHERE medal = 'gold')
    INTO 
        v_bronze_count,
        v_silver_count,
        v_gold_count
    FROM user_medals
    WHERE user_id = p_user_id;

    -- Hole Streak-Informationen
    SELECT current_streak INTO v_quiz_streak
    FROM user_streaks
    WHERE user_id = p_user_id;

    SELECT current_streak INTO v_daily_streak
    FROM daily_streaks
    WHERE user_id = p_user_id;

    -- Rückgabe der Statistiken
    RETURN jsonb_build_object(
        'status', 'success',
        'stats', jsonb_build_object(
            'xp', v_total_xp,
            'coins', v_total_coins,
            'level', v_current_level,
            'level_title', v_level_title,
            'next_level_xp', v_next_level_xp,
            'progress_to_next_level', v_progress_to_next_level,
            'medals', jsonb_build_object(
                'bronze', v_bronze_count,
                'silver', v_silver_count,
                'gold', v_gold_count,
                'total', (v_bronze_count + v_silver_count + v_gold_count)
            ),
            'streaks', jsonb_build_object(
                'quiz_streak', COALESCE(v_quiz_streak, 0),
                'daily_streak', COALESCE(v_daily_streak, 0)
            )
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
