-- File: update_streak.sql
-- Drop alle möglichen Varianten der Funktion
DROP FUNCTION IF EXISTS public.update_streak(UUID, BOOLEAN);
DROP FUNCTION IF EXISTS public.update_streak(UUID);
DROP FUNCTION IF EXISTS update_streak(UUID, BOOLEAN);
DROP FUNCTION IF EXISTS update_streak(UUID);

CREATE OR REPLACE FUNCTION public.update_streak(
    p_user_id UUID,
    p_is_correct BOOLEAN
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_streak INTEGER;
    v_max_streak INTEGER;
    v_streak_bonus INTEGER;
    v_error_message TEXT;
    v_last_updated TIMESTAMP;
    v_streak_broken BOOLEAN;
BEGIN
    -- Hole aktuelle Streak-Daten
    SELECT current_streak, max_streak, last_updated
    INTO v_current_streak, v_max_streak, v_last_updated
    FROM user_streaks
    WHERE user_id = p_user_id;

    -- Erstelle Streak-Eintrag falls nicht vorhanden
    IF v_current_streak IS NULL THEN
        INSERT INTO user_streaks (user_id, current_streak, max_streak, last_updated)
        VALUES (p_user_id, 0, 0, NOW())
        RETURNING current_streak, max_streak, last_updated
        INTO v_current_streak, v_max_streak, v_last_updated;
    END IF;

    -- Prüfe ob Streak gebrochen (mehr als 24h seit letzter Antwort)
    v_streak_broken := v_last_updated < NOW() - INTERVAL '24 hours';

    -- Aktualisiere Streak basierend auf Korrektheit
    IF p_is_correct THEN
        IF v_streak_broken THEN
            v_current_streak := 1;
        ELSE
            v_current_streak := v_current_streak + 1;
        END IF;

        -- Aktualisiere max_streak wenn nötig
        IF v_current_streak > v_max_streak THEN
            v_max_streak := v_current_streak;
        END IF;

        -- Berechne Streak-Bonus
        v_streak_bonus := CASE
            WHEN v_current_streak >= 5 THEN 50  -- 50 XP Bonus ab 5er Streak
            WHEN v_current_streak >= 3 THEN 30  -- 30 XP Bonus ab 3er Streak
            ELSE 0
        END;

        -- Vergebe Bonus-XP wenn Streak-Bonus vorhanden
        IF v_streak_bonus > 0 THEN
            UPDATE user_stats
            SET total_xp = total_xp + v_streak_bonus,
                last_updated = NOW()
            WHERE user_id = p_user_id;
        END IF;
    ELSE
        -- Bei falscher Antwort: Streak zurücksetzen
        v_current_streak := 0;
        v_streak_bonus := 0;
    END IF;

    -- Aktualisiere user_streaks
    UPDATE user_streaks
    SET current_streak = v_current_streak,
        max_streak = v_max_streak,
        last_updated = NOW()
    WHERE user_id = p_user_id;

    -- Erfolgsmeldung zurückgeben
    RETURN jsonb_build_object(
        'status', 'success',
        'current_streak', v_current_streak,
        'max_streak', v_max_streak,
        'streak_bonus', v_streak_bonus,
        'streak_broken', v_streak_broken,
        'last_updated', v_last_updated
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
