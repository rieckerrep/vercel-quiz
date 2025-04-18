-- Lösche alle existierenden Varianten der Funktion
DROP FUNCTION IF EXISTS public.update_level_on_xp_change(UUID);
DROP FUNCTION IF EXISTS update_level_on_xp_change(UUID);

CREATE OR REPLACE FUNCTION public.update_level_on_xp_change(
    p_user_id UUID
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_exists BOOLEAN;
    v_current_xp INTEGER;
    v_current_level INTEGER;
    v_new_level INTEGER;
    v_streak_count INTEGER;
    v_level_up_bonus INTEGER;
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

    -- Hole aktuelle XP und Level
    SELECT 
        us.total_xp,
        us.current_level,
        COALESCE(us.current_streak, 0)
    INTO 
        v_current_xp,
        v_current_level,
        v_streak_count
    FROM user_stats us
    WHERE us.user_id = p_user_id;

    -- Bestimme neues Level basierend auf XP
    SELECT MAX(level)
    INTO v_new_level
    FROM levels
    WHERE xp_required <= v_current_xp;

    -- Berechne Level-Up Bonus basierend auf Streak
    IF v_new_level > v_current_level THEN
        v_level_up_bonus := CASE 
            WHEN v_streak_count >= 10 THEN 200
            WHEN v_streak_count >= 5 THEN 100
            WHEN v_streak_count >= 3 THEN 50
            ELSE 25
        END;
    ELSE
        v_level_up_bonus := 0;
    END IF;

    -- Aktualisiere Level in der Datenbank
    IF v_new_level > v_current_level THEN
        UPDATE user_stats
        SET 
            current_level = v_new_level,
            total_xp = total_xp + v_level_up_bonus
        WHERE user_id = p_user_id;
    END IF;

    -- Erstelle Rückgabe-Objekt
    SELECT jsonb_build_object(
        'success', true,
        'data', jsonb_build_object(
            'old_level', v_current_level,
            'new_level', v_new_level,
            'current_xp', v_current_xp,
            'streak_count', v_streak_count,
            'level_up_bonus', v_level_up_bonus,
            'level_up_occurred', v_new_level > v_current_level
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