-- DROP FUNCTION IF EXISTS public.submit_answer(UUID, INTEGER, TEXT, INTEGER, BOOLEAN);
CREATE OR REPLACE FUNCTION public.submit_answer(
    p_user_id UUID,
    p_question_id INTEGER,
    p_answer TEXT,
    p_subquestion_id INTEGER DEFAULT NULL,
    p_streak_boost_active BOOLEAN DEFAULT false
) RETURNS JSONB
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
    v_xp_awarded INTEGER := 0;
    v_coins_awarded INTEGER := 0;
    v_chapter_id INTEGER;
    v_current_progress INTEGER;
    v_new_progress INTEGER;
    v_base_xp INTEGER;
    v_streak_count INTEGER;
    v_is_correct BOOLEAN;
    already_answered BOOLEAN;
BEGIN
    -- Anti-Farming: Prüfen, ob die Frage schon beantwortet wurde
    SELECT TRUE INTO already_answered
    FROM answered_questions
    WHERE user_id = p_user_id AND question_id = p_question_id;

    IF already_answered THEN
        RETURN jsonb_build_object('error', '🚫 Diese Frage wurde bereits beantwortet.');
    END IF;

    -- Prüfe ob die Antwort korrekt ist
    SELECT check_answer(p_question_id, p_answer, p_subquestion_id) INTO v_is_correct;

    -- Kapitel aus der Frage ermitteln
    SELECT chapter_id INTO v_chapter_id
    FROM questions
    WHERE id = p_question_id;

    -- Basis-XP aus question_type ermitteln
    SELECT qt.base_xp INTO v_base_xp
    FROM questions q
    JOIN question_types qt ON q.question_type_id = qt.id
    WHERE q.id = p_question_id;

    -- Aktuelle Streak ermitteln
    SELECT current_streak INTO v_streak_count
    FROM user_streaks
    WHERE user_id = p_user_id;

    IF v_is_correct THEN
        -- XP und Coins für richtige Antwort
        v_xp_awarded := COALESCE(v_base_xp, 10); -- Fallback auf 10 XP wenn kein base_xp definiert
        v_coins_awarded := 10;

        -- Streak nur behandeln wenn Streak-Boost aktiv ist
        IF p_streak_boost_active THEN
            IF v_streak_count >= 2 THEN -- Bei 3. richtiger Antwort in Folge
                v_xp_awarded := v_xp_awarded + 30; -- Bonus XP
                -- Streak zurücksetzen
                UPDATE user_streaks 
                SET current_streak = 0,
                    last_updated = NOW()
                WHERE user_id = p_user_id;
            ELSE
                -- Streak erhöhen
                UPDATE user_streaks 
                SET current_streak = COALESCE(current_streak, 0) + 1,
                    last_updated = NOW()
                WHERE user_id = p_user_id;
            END IF;
        END IF;
    ELSE
        -- Münzverlust bei falscher Antwort
        v_coins_awarded := -5;
        -- Streak zurücksetzen
        UPDATE user_streaks 
        SET current_streak = 0,
            last_updated = NOW()
        WHERE user_id = p_user_id;
    END IF;

    -- Antwort speichern
    INSERT INTO answered_questions (
        user_id, 
        question_id, 
        is_correct,
        given_answer,
        chapter_id, 
        answered_at
    ) VALUES (
        p_user_id, 
        p_question_id, 
        v_is_correct,
        p_answer,
        v_chapter_id, 
        NOW()
    );

    -- Update der user_stats
    UPDATE user_stats
    SET
        total_xp = COALESCE(total_xp, 0) + v_xp_awarded,
        total_coins = GREATEST(COALESCE(total_coins, 0) + v_coins_awarded, 0), -- Verhindert negative Coins
        questions_answered = COALESCE(questions_answered, 0) + 1,
        correct_answers = COALESCE(correct_answers, 0) + CASE WHEN v_is_correct THEN 1 ELSE 0 END,
        last_played = NOW()
    WHERE user_id = p_user_id;

    -- Fortschritt berechnen
    SELECT 
        ROUND((COUNT(*)::float / (SELECT COUNT(*) FROM questions WHERE chapter_id = v_chapter_id)) * 100)::integer
    INTO v_new_progress
    FROM answered_questions
    WHERE user_id = p_user_id 
        AND chapter_id = v_chapter_id 
        AND is_correct = TRUE;

    -- Fortschritt speichern/aktualisieren
    INSERT INTO quiz_progress (
        user_id, 
        chapter_id, 
        progress, 
        updated_at
    ) VALUES (
        p_user_id, 
        v_chapter_id, 
        v_new_progress, 
        NOW()
    )
    ON CONFLICT (user_id, chapter_id)
    DO UPDATE SET 
        progress = v_new_progress, 
        updated_at = NOW();

    -- Daily Streak aktualisieren
    PERFORM update_daily_streak(p_user_id);
    
    -- Level-Check
    PERFORM update_level_on_xp_change(p_user_id);

    -- Medaillen prüfen und vergeben wenn Kapitel komplett
    IF (
        SELECT COUNT(DISTINCT aq.question_id) = (
            SELECT COUNT(*) FROM questions WHERE chapter_id = v_chapter_id
        )
        FROM answered_questions aq
        WHERE aq.user_id = p_user_id 
            AND aq.chapter_id = v_chapter_id
    ) THEN
        PERFORM assign_medals_on_completion(p_user_id, v_chapter_id);
    END IF;

    RETURN jsonb_build_object(
        'xp_awarded', v_xp_awarded,
        'coins_awarded', v_coins_awarded,
        'new_progress', v_new_progress,
        'streak', COALESCE(v_streak_count, 0),
        'is_correct', v_is_correct
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('error', SQLERRM);
END;
$$; 