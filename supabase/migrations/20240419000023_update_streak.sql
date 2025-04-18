-- Lösche alle existierenden Varianten der Funktion
DROP FUNCTION IF EXISTS public.update_streak(UUID, BOOLEAN);
DROP FUNCTION IF EXISTS update_streak(UUID, BOOLEAN);

CREATE OR REPLACE FUNCTION public.update_streak(
    p_user_id UUID,
    p_is_correct BOOLEAN
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_exists BOOLEAN;
    v_current_streak INTEGER;
    v_longest_streak INTEGER;
    v_last_activity TIMESTAMP;
    v_streak_bonus INTEGER;
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

    -- Hole aktuelle Streak-Daten
    SELECT 
        current_streak,
        longest_streak,
        last_activity,
        streak_bonus
    INTO 
        v_current_streak,
        v_longest_streak,
        v_last_activity,
        v_streak_bonus
    FROM user_streaks
    WHERE user_id = p_user_id;

    -- Prüfe ob Streak gebrochen wurde
    IF NOT p_is_correct THEN
        v_current_streak := 0;
    ELSE
        -- Aktualisiere Streak
        v_current_streak := v_current_streak + 1;
        v_longest_streak := GREATEST(v_current_streak, v_longest_streak);
        
        -- Berechne Streak-Bonus
        v_streak_bonus := CASE 
            WHEN v_current_streak >= 10 THEN 100
            WHEN v_current_streak >= 5 THEN 50
            WHEN v_current_streak >= 3 THEN 25
            ELSE 10
        END;
    END IF;

    -- Aktualisiere Datenbank
    INSERT INTO user_streaks (user_id, current_streak, longest_streak, last_activity, streak_bonus)
    VALUES (p_user_id, v_current_streak, v_longest_streak, CURRENT_TIMESTAMP, v_streak_bonus)
    ON CONFLICT (user_id) DO UPDATE SET
        current_streak = EXCLUDED.current_streak,
        longest_streak = EXCLUDED.longest_streak,
        last_activity = EXCLUDED.last_activity,
        streak_bonus = EXCLUDED.streak_bonus;

    -- Erstelle Rückgabe-Objekt
    SELECT jsonb_build_object(
        'success', true,
        'data', jsonb_build_object(
            'current_streak', v_current_streak,
            'longest_streak', v_longest_streak,
            'last_activity', CURRENT_TIMESTAMP,
            'streak_bonus', v_streak_bonus,
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