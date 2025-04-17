-- File: update_level_on_xp_change.sql
-- Drop alle möglichen Varianten der Funktion
DROP FUNCTION IF EXISTS public.update_level_on_xp_change(UUID);
DROP FUNCTION IF EXISTS update_level_on_xp_change(UUID);

CREATE OR REPLACE FUNCTION public.update_level_on_xp_change(
    p_user_id UUID
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_xp INTEGER;
    v_current_level INTEGER;
    v_new_level INTEGER;
    v_xp_to_next_level INTEGER;
    v_level_title TEXT;
    v_error_message TEXT;
    v_streak_count INTEGER;
    v_level_up_bonus INTEGER;
BEGIN
    -- Hole aktuelle XP und Level
    SELECT total_xp, level, level_title
    INTO v_current_xp, v_current_level, v_level_title
    FROM user_stats
    WHERE user_id = p_user_id;

    -- Finde neues Level basierend auf XP
    SELECT l.level, l.xp_required
    INTO v_new_level, v_xp_to_next_level
    FROM levels l
    WHERE l.xp_required <= v_current_xp
    ORDER BY l.xp_required DESC
    LIMIT 1;

    -- Wenn kein neues Level gefunden wurde
    IF v_new_level IS NULL THEN
        v_new_level := v_current_level;
    END IF;

    -- Hole aktuelle Streak für Bonus-Berechnung
    SELECT current_streak 
    INTO v_streak_count
    FROM user_streaks
    WHERE user_id = p_user_id;

    -- Berechne Level-Up-Bonus basierend auf Streak
    v_level_up_bonus := 0;
    IF v_new_level > v_current_level THEN
        v_level_up_bonus := 100 * (v_new_level - v_current_level); -- Basis-Bonus
        IF v_streak_count >= 3 THEN
            v_level_up_bonus := v_level_up_bonus * 1.5; -- 50% Bonus bei Streak
        END IF;
    END IF;

    -- Aktualisiere user_stats wenn Level-Up
    IF v_new_level > v_current_level THEN
        UPDATE user_stats
        SET level = v_new_level,
            total_coins = total_coins + v_level_up_bonus,
            last_updated = NOW()
        WHERE user_id = p_user_id;

        -- Hole neuen Level-Titel
        SELECT title INTO v_level_title
        FROM levels
        WHERE level = v_new_level;
    END IF;

    -- Erfolgsmeldung zurückgeben
    RETURN jsonb_build_object(
        'status', 'success',
        'old_level', v_current_level,
        'new_level', v_new_level,
        'current_xp', v_current_xp,
        'xp_to_next_level', v_xp_to_next_level,
        'level_title', v_level_title,
        'level_up_bonus', v_level_up_bonus,
        'streak_count', v_streak_count
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


ALTER FUNCTION "public"."update_level_on_xp_change"("user_id" "uuid") OWNER TO "postgres";


