-- File: update_daily_streak.sql
-- Drop alle möglichen Varianten der Funktion
DROP FUNCTION IF EXISTS public.update_daily_streak(UUID);
DROP FUNCTION IF EXISTS update_daily_streak(UUID);

CREATE OR REPLACE FUNCTION public.update_daily_streak(
    p_user_id UUID
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_streak INTEGER;
    v_max_streak INTEGER;
    v_last_active_date DATE;
    v_error_message TEXT;
    v_berlin_today DATE;
    v_yesterday DATE;
    v_streak_bonus INTEGER;
BEGIN
    -- Setze Zeitzone auf Berlin
    v_berlin_today := timezone('Europe/Berlin', now())::DATE;
    v_yesterday := v_berlin_today - INTERVAL '1 day';

    -- Hole aktuelle Streak-Daten
    SELECT current_streak, max_streak, last_active_date
    INTO v_current_streak, v_max_streak, v_last_active_date
    FROM daily_streaks
    WHERE user_id = p_user_id;

    -- Erstelle Streak-Eintrag falls nicht vorhanden
    IF v_current_streak IS NULL THEN
        INSERT INTO daily_streaks (
            user_id, 
            current_streak, 
            max_streak,
            last_active_date, 
            last_updated
        )
        VALUES (
            p_user_id, 
            1, 
            1,
            v_berlin_today, 
            NOW()
        )
        RETURNING current_streak, max_streak, last_active_date
        INTO v_current_streak, v_max_streak, v_last_active_date;

        -- Erfolgsmeldung für neuen Streak
        RETURN jsonb_build_object(
            'status', 'success',
            'message', 'Neuer Daily Streak gestartet',
            'current_streak', 1,
            'max_streak', 1,
            'streak_bonus', 0
        );
    END IF;

    -- Wenn heute bereits aktiv war
    IF v_last_active_date = v_berlin_today THEN
        RETURN jsonb_build_object(
            'status', 'success',
            'message', 'Bereits heute aktiv gewesen',
            'current_streak', v_current_streak,
            'max_streak', v_max_streak,
            'streak_bonus', 0
        );
    END IF;

    -- Wenn gestern aktiv war, erhöhe Streak
    IF v_last_active_date = v_yesterday THEN
        v_current_streak := v_current_streak + 1;
        
        -- Aktualisiere max_streak wenn nötig
        IF v_current_streak > v_max_streak THEN
            v_max_streak := v_current_streak;
        END IF;

        -- Berechne Streak-Bonus
        v_streak_bonus := CASE
            WHEN v_current_streak >= 7 THEN 100  -- 100 Coins Bonus ab 7 Tagen
            WHEN v_current_streak >= 3 THEN 50   -- 50 Coins Bonus ab 3 Tagen
            ELSE 25                              -- 25 Coins Basis-Bonus
        END;

        -- Aktualisiere daily_streaks
        UPDATE daily_streaks
        SET current_streak = v_current_streak,
            max_streak = v_max_streak,
            last_active_date = v_berlin_today,
            last_updated = NOW()
        WHERE user_id = p_user_id;

        -- Vergebe Bonus-Coins
        UPDATE user_stats
        SET total_coins = total_coins + v_streak_bonus,
            last_updated = NOW()
        WHERE user_id = p_user_id;

        RETURN jsonb_build_object(
            'status', 'success',
            'message', 'Daily Streak erhöht',
            'current_streak', v_current_streak,
            'max_streak', v_max_streak,
            'streak_bonus', v_streak_bonus
        );
    END IF;

    -- Wenn Streak gebrochen wurde, setze zurück
    UPDATE daily_streaks
    SET current_streak = 1,
        last_active_date = v_berlin_today,
        last_updated = NOW()
    WHERE user_id = p_user_id;

    -- Basis-Bonus für neue Streak
    UPDATE user_stats
    SET total_coins = total_coins + 25,
        last_updated = NOW()
    WHERE user_id = p_user_id;

    RETURN jsonb_build_object(
        'status', 'success',
        'message', 'Daily Streak zurückgesetzt',
        'current_streak', 1,
        'max_streak', v_max_streak,
        'streak_bonus', 25
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
