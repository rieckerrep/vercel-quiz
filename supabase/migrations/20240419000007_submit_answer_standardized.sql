-- Lösche alle existierenden Varianten der Funktion
DROP FUNCTION IF EXISTS public.submit_answer(UUID, INTEGER, TEXT, INTEGER, BOOLEAN);
DROP FUNCTION IF EXISTS public.submit_answer(UUID, INTEGER, TEXT, INTEGER);
DROP FUNCTION IF EXISTS public.submit_answer(UUID, INTEGER, TEXT);
DROP FUNCTION IF EXISTS public.submit_answer(UUID, INTEGER, BOOLEAN);
DROP FUNCTION IF EXISTS public.submit_answer(UUID, INTEGER);
DROP FUNCTION IF EXISTS submit_answer(UUID, INTEGER, TEXT, INTEGER, BOOLEAN);
DROP FUNCTION IF EXISTS submit_answer(UUID, INTEGER, TEXT, INTEGER);
DROP FUNCTION IF EXISTS submit_answer(UUID, INTEGER, TEXT);
DROP FUNCTION IF EXISTS submit_answer(UUID, INTEGER, BOOLEAN);
DROP FUNCTION IF EXISTS submit_answer(UUID, INTEGER);

CREATE OR REPLACE FUNCTION public.submit_answer(
    p_user_id UUID,
    p_question_id INTEGER,
    p_answer_text TEXT,
    p_subquestion_id INTEGER DEFAULT NULL,
    p_streak_boost_active BOOLEAN DEFAULT false
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_exists BOOLEAN;
    v_question_exists BOOLEAN;
    v_question_type TEXT;
    v_is_correct BOOLEAN;
    v_xp_awarded INTEGER := 0;
    v_coins_awarded INTEGER := 0;
    v_chapter_id BIGINT;
    v_current_progress INTEGER;
    v_new_progress INTEGER;
    v_base_xp INTEGER;
    v_streak_count INTEGER;
    v_result jsonb;
    already_answered BOOLEAN;
BEGIN
    -- Anti-Farming: Prüfen, ob die Frage schon beantwortet wurde
    SELECT TRUE INTO already_answered
    FROM answered_questions
    WHERE user_id = p_user_id AND question_id = p_question_id;

    IF already_answered THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Diese Frage wurde bereits beantwortet',
            'error', '🚫 Diese Frage wurde bereits beantwortet.'
        );
    END IF;

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

    -- Prüfe ob Frage existiert und hole den Typ
    SELECT EXISTS (
        SELECT 1 FROM questions WHERE id = p_question_id
    ),
    question_type,
    chapter_id
    INTO v_question_exists, v_question_type, v_chapter_id
    FROM questions
    WHERE id = p_question_id;

    IF NOT v_question_exists THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Frage nicht gefunden',
            'error', format('Frage mit ID %s existiert nicht', p_question_id)
        );
    END IF;

    -- Prüfe Antwort basierend auf dem Fragetyp
    CASE v_question_type
        WHEN 'multiple_choice' THEN
            SELECT EXISTS (
                SELECT 1 
                FROM multiple_choice_options 
                WHERE question_id = p_question_id 
                AND option_text = p_answer_text
                AND is_correct = true
            ) INTO v_is_correct;

        WHEN 'drag_drop' THEN
            SELECT EXISTS (
                SELECT 1 
                FROM dragdrop_pairs dp
                JOIN dragdrop_groups dg ON dp.group_id = dg.id
                WHERE dg.question_id = p_question_id 
                AND dp.drag_text = p_answer_text
                AND dp.correct_match IS NOT NULL
            ) INTO v_is_correct;

        WHEN 'case_question' THEN
            IF p_subquestion_id IS NULL THEN
                RETURN jsonb_build_object(
                    'success', false,
                    'message', 'Unterfrage-ID fehlt',
                    'error', 'Für Fallfragen muss eine Unterfrage-ID angegeben werden'
                );
            END IF;
            
            SELECT EXISTS (
                SELECT 1 
                FROM cases_subquestions 
                WHERE id = p_subquestion_id
                AND question_id = p_question_id 
                AND correct_answer = p_answer_text
            ) INTO v_is_correct;

        ELSE
            -- Für einfache Fragen mit direkter Antwort
            SELECT "Richtige Antwort" = p_answer_text
            FROM questions 
            WHERE id = p_question_id
            INTO v_is_correct;
    END CASE;

    -- Hole Basis-XP und Streak
    SELECT 
        qt.base_xp,
        COALESCE(us.current_streak, 0)
    INTO 
        v_base_xp,
        v_streak_count
    FROM questions q
    JOIN question_types qt ON q.question_type_id = qt.id_uuid
    LEFT JOIN user_streaks us ON us.user_id = p_user_id
    WHERE q.id = p_question_id;

    IF v_is_correct THEN
        -- XP und Coins für richtige Antwort
        v_xp_awarded := COALESCE(v_base_xp, 10);
        v_coins_awarded := 10;

        -- Streak nur behandeln wenn Streak-Boost aktiv ist
        IF p_streak_boost_active THEN
            IF v_streak_count >= 2 THEN -- Bei 3. richtiger Antwort in Folge
                v_xp_awarded := v_xp_awarded + 30;
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
        p_answer_text,
        v_chapter_id, 
        NOW()
    );

    -- Update der user_stats
    UPDATE user_stats
    SET
        total_xp = COALESCE(total_xp, 0) + v_xp_awarded,
        total_coins = GREATEST(COALESCE(total_coins, 0) + v_coins_awarded, 0),
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

    -- Erstelle Rückgabe-Objekt
    SELECT jsonb_build_object(
        'success', true,
        'data', jsonb_build_object(
            'is_correct', v_is_correct,
            'xp_awarded', v_xp_awarded,
            'coins_awarded', v_coins_awarded,
            'new_progress', v_new_progress,
            'streak', COALESCE(v_streak_count, 0),
            'question_type', v_question_type
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