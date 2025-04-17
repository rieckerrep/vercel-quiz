-- File: submit_answer.sql
DROP FUNCTION IF EXISTS public.submit_answer(UUID, INTEGER, TEXT, INTEGER, BOOLEAN);
DROP FUNCTION IF EXISTS public.submit_answer(UUID, INTEGER, TEXT, INTEGER);
DROP FUNCTION IF EXISTS public.submit_answer(UUID, INTEGER, TEXT);
DROP FUNCTION IF EXISTS submit_answer(UUID, INTEGER, TEXT, INTEGER, BOOLEAN);
DROP FUNCTION IF EXISTS submit_answer(UUID, INTEGER, TEXT, INTEGER);
DROP FUNCTION IF EXISTS submit_answer(UUID, INTEGER, TEXT);

CREATE OR REPLACE FUNCTION public.submit_answer(
    p_user_id UUID,
    p_question_id INTEGER,
    p_answer TEXT,
    p_subquestion_id INTEGER DEFAULT NULL,
    p_streak_boost_active BOOLEAN DEFAULT false
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_is_correct BOOLEAN;
    v_xp_awarded INTEGER;
    v_coins_awarded INTEGER;
    v_new_streak INTEGER;
    v_error_message TEXT;
    v_chapter_id UUID;
    v_base_xp INTEGER;
    v_streak_count INTEGER;
    v_new_progress INTEGER;
BEGIN
    -- Prüfe ob die Frage bereits beantwortet wurde
    IF EXISTS (
        SELECT 1 FROM answered_questions 
        WHERE user_id = p_user_id AND question_id = p_question_id
    ) THEN
        RETURN jsonb_build_object(
            'error', 'Frage wurde bereits beantwortet',
            'status', 'error'
        );
    END IF;

    -- Hole Kapitel-ID und Basis-XP
    SELECT q.chapter_id, qt.base_xp 
    INTO v_chapter_id, v_base_xp
    FROM questions q
    JOIN question_types qt ON q.question_type_id = qt.id
    WHERE q.id = p_question_id;

    -- Prüfe die Antwort
    SELECT check_answer(p_question_id, p_answer, p_subquestion_id) INTO v_is_correct;

    -- Berechne XP und Coins
    SELECT calculate_and_award_xp(p_user_id, p_question_id, v_is_correct) INTO v_xp_awarded;
    
    -- Berechne Coins basierend auf XP
    v_coins_awarded := v_xp_awarded / 10;

    -- Aktualisiere Streak
    SELECT update_streak(p_user_id, v_is_correct) INTO v_new_streak;

    -- Speichere die Antwort mit allen erforderlichen Feldern
    INSERT INTO answered_questions (
        user_id, 
        question_id, 
        is_correct,
        given_answer,
        chapter_id,
        xp_awarded, 
        coins_awarded,
        answered_at
    ) VALUES (
        p_user_id, 
        p_question_id, 
        v_is_correct,
        p_answer,
        v_chapter_id,
        v_xp_awarded, 
        v_coins_awarded,
        NOW()
    );

    -- Aktualisiere Statistiken mit allen Feldern
    UPDATE user_stats
    SET total_xp = total_xp + v_xp_awarded,
        total_coins = total_coins + v_coins_awarded,
        correct_answers = correct_answers + CASE WHEN v_is_correct THEN 1 ELSE 0 END,
        total_answers = total_answers + 1,
        last_played = NOW()
    WHERE user_id = p_user_id;

    -- Berechne neuen Fortschritt
    SELECT 
        ROUND((COUNT(*)::float / (SELECT COUNT(*) FROM questions WHERE chapter_id = v_chapter_id)) * 100)::integer
    INTO v_new_progress
    FROM answered_questions
    WHERE user_id = p_user_id 
        AND chapter_id = v_chapter_id 
        AND is_correct = TRUE;

    -- Aktualisiere Quiz-Fortschritt
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

    -- Aktualisiere täglichen Streak
    PERFORM update_daily_streak(p_user_id);
    
    -- Prüfe Level-Up
    PERFORM update_level_on_xp_change(p_user_id);

    -- Prüfe auf Kapitelabschluss und vergebe Medaillen
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

    -- Erfolgsmeldung zurückgeben
    RETURN jsonb_build_object(
        'status', 'success',
        'is_correct', v_is_correct,
        'xp_awarded', v_xp_awarded,
        'coins_awarded', v_coins_awarded,
        'new_streak', v_new_streak,
        'new_progress', v_new_progress
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
