-- Migration: Add submit_answer function
-- Description: Creates the submit_answer function for processing quiz answers

DROP FUNCTION IF EXISTS public.submit_answer(
    p_user_id uuid,
    p_question_id bigint,
    p_answer_data jsonb,
    p_used_items jsonb DEFAULT NULL
);

CREATE OR REPLACE FUNCTION public.submit_answer(
    p_user_id uuid,
    p_question_id bigint,
    p_answer_data jsonb,
    p_used_items jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_question_type_id uuid;
    v_chapter_id bigint;
    v_correct_answer text;
    v_is_correct boolean;
    v_xp_earned integer;
    v_coins_earned integer;
    v_new_streak integer;
    v_current_streak integer;
    v_new_progress integer;
    v_medal_awarded text;
    v_question_type text;
    v_multiplier numeric := 1.0;
    v_reward_type_id uuid;
BEGIN
    -- Hole Frage-Informationen
    SELECT 
        q.question_type_id,
        q.chapter_id,
        q.correct_answer,
        qt.id
    INTO 
        v_question_type_id,
        v_chapter_id,
        v_correct_answer,
        v_question_type
    FROM public.questions q
    JOIN public.question_types qt ON q.question_type_id = qt.id_uuid
    WHERE q.id = p_question_id;

    -- Prüfe Antwort basierend auf Fragetyp
    CASE v_question_type
        WHEN 'multiple_choice' THEN
            v_is_correct := p_answer_data->>'selected_option' = v_correct_answer;
        
        WHEN 'true_false' THEN
            v_is_correct := (p_answer_data->>'is_true')::boolean = (v_correct_answer = 'true');
        
        WHEN 'open_question' THEN
            -- Bei Open Questions entscheidet der Nutzer selbst
            v_is_correct := (p_answer_data->>'is_correct')::boolean;
        
        WHEN 'fill_blank' THEN
            v_is_correct := lower(p_answer_data->>'answer') = lower(v_correct_answer);
        
        WHEN 'sequence' THEN
            -- Prüfe Reihenfolge der Elemente
            v_is_correct := (
                SELECT array_agg(step_id ORDER BY position) = array_agg(step_id ORDER BY correct_order)
                FROM unnest((p_answer_data->>'sequence')::uuid[]) WITH ORDINALITY AS t(step_id, position)
                JOIN public.sequence_steps ss ON ss.id = step_id
            );
        
        WHEN 'dragdrop' THEN
            -- Prüfe Drag & Drop Paare
            v_is_correct := (
                SELECT bool_and(pair->>'drag_id' = pair->>'correct_match')
                FROM jsonb_array_elements(p_answer_data->'pairs') AS pair
            );
        
        WHEN 'case' THEN
            -- Prüfe Subfragen
            v_is_correct := (
                SELECT bool_and(subq->>'is_correct' = 'true')
                FROM jsonb_array_elements(p_answer_data->'subquestions') AS subq
            );
        
        WHEN 'dispute' THEN
            -- Spezielle Verarbeitung für Streitfälle
            v_is_correct := true; -- Bei Disputes wird die Bewertung separat gehandhabt
    END CASE;

    -- Hole Reward-Typ und berechne Belohnungen
    SELECT 
        id,
        CASE 
            WHEN v_is_correct THEN base_xp
            ELSE -base_lose_xp
        END,
        CASE 
            WHEN v_is_correct THEN base_coins
            ELSE -base_lose_coins
        END
    INTO 
        v_reward_type_id,
        v_xp_earned,
        v_coins_earned
    FROM public.reward_types
    WHERE question_type = v_question_type
    AND reward_type = 'quiz_answer';

    -- Aktualisiere Streak
    SELECT current_streak INTO v_current_streak
    FROM public.daily_streaks
    WHERE user_id = p_user_id;

    IF v_current_streak IS NULL THEN
        v_new_streak := 1;
        INSERT INTO public.daily_streaks (user_id, current_streak, last_active_date)
        VALUES (p_user_id, 1, CURRENT_DATE);
    ELSE
        v_new_streak := v_current_streak + 1;
        UPDATE public.daily_streaks
        SET current_streak = v_new_streak,
            last_active_date = CURRENT_DATE
        WHERE user_id = p_user_id;
    END IF;

    -- Speichere Antwort
    INSERT INTO public.answered_questions (
        user_id,
        question_id,
        is_correct,
        answered_at,
        chapter_id
    ) VALUES (
        p_user_id,
        p_question_id,
        v_is_correct,
        NOW(),
        v_chapter_id
    );

    -- Speichere Belohnungen
    INSERT INTO public.answered_rewards (
        user_id,
        question_context_id,
        reward_type_id,
        xp_earned,
        coins_earned,
        created_at
    ) VALUES (
        p_user_id,
        p_question_id::text::uuid,
        v_reward_type_id,
        v_xp_earned,
        v_coins_earned,
        NOW()
    );

    -- Aktualisiere Benutzerstatistiken
    UPDATE public.user_stats
    SET 
        total_xp = COALESCE(total_xp, 0) + v_xp_earned,
        total_coins = COALESCE(total_coins, 0) + v_coins_earned,
        questions_answered = COALESCE(questions_answered, 0) + 1,
        correct_answers = COALESCE(correct_answers, 0) + CASE WHEN v_is_correct THEN 1 ELSE 0 END,
        last_played = NOW()
    WHERE user_id = p_user_id;

    -- Berechne neuen Fortschritt
    SELECT 
        ROUND(
            (COUNT(*) FILTER (WHERE aq.is_correct)::float / COUNT(*)::float) * 100
        )::integer
    INTO v_new_progress
    FROM public.answered_questions aq
    WHERE aq.user_id = p_user_id
    AND aq.chapter_id = v_chapter_id;

    -- Aktualisiere Kapitelfortschritt
    INSERT INTO public.quiz_progress (user_id, chapter_id, progress)
    VALUES (p_user_id, v_chapter_id, v_new_progress)
    ON CONFLICT (user_id, chapter_id)
    DO UPDATE SET progress = v_new_progress;

    -- Prüfe auf Medaillen
    IF v_new_progress >= 100 THEN
        v_medal_awarded := 'gold';
    ELSIF v_new_progress >= 75 THEN
        v_medal_awarded := 'silver';
    ELSIF v_new_progress >= 50 THEN
        v_medal_awarded := 'bronze';
    END IF;

    -- Return Ergebnis
    RETURN jsonb_build_object(
        'is_correct', v_is_correct,
        'xp_earned', v_xp_earned,
        'coins_earned', v_coins_earned,
        'new_streak', v_new_streak,
        'new_progress', v_new_progress,
        'medal_awarded', v_medal_awarded,
        'explanation', (
            SELECT explanation 
            FROM public.questions 
            WHERE id = p_question_id
        )
    );
END;
$$; 