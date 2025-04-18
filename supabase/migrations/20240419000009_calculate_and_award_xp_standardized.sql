-- Lösche alle existierenden Varianten der Funktion
DROP FUNCTION IF EXISTS public.calculate_and_award_xp(UUID, INTEGER, BOOLEAN);
DROP FUNCTION IF EXISTS calculate_and_award_xp(UUID, INTEGER, BOOLEAN);

CREATE OR REPLACE FUNCTION public.calculate_and_award_xp(
    p_user_id UUID,
    p_question_id INTEGER,
    p_is_correct BOOLEAN
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_base_xp INTEGER;
    v_streak_count INTEGER;
    v_final_xp INTEGER;
    v_error_message TEXT;
BEGIN
    -- Hole Basis-XP und Streak
    SELECT 
        qt.base_xp,
        COALESCE(us.streak_count, 0)
    INTO 
        v_base_xp,
        v_streak_count
    FROM questions q
    JOIN question_types qt ON q.question_type_id = qt.id
    LEFT JOIN user_stats us ON us.user_id = p_user_id
    WHERE q.id = p_question_id;

    -- Berechne finales XP
    IF p_is_correct THEN
        v_final_xp := v_base_xp * (1 + (v_streak_count * 0.1));
    ELSE
        v_final_xp := 0;
    END IF;

    -- Aktualisiere XP in der Datenbank
    UPDATE user_stats
    SET total_xp = total_xp + v_final_xp,
        last_played = NOW()
    WHERE user_id = p_user_id;

    RETURN v_final_xp;

EXCEPTION
    WHEN OTHERS THEN
        v_error_message := SQLERRM;
        RAISE EXCEPTION 'Fehler bei der XP-Berechnung: %', v_error_message;
END;
$$; 