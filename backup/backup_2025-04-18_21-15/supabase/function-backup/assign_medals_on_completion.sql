-- File: assign_medals_on_completion.sql
-- Funktion zum Vergeben von Medaillen nach Abschluss eines Kapitels
-- Parameter:
--   user_id: UUID des Benutzers
--   chapter_id: UUID des Kapitels
-- Rückgabewert: JSONB mit Status und Details der Medaillenvergabe

DROP FUNCTION IF EXISTS public.assign_medals_on_completion(
    user_id UUID,
    chapter_id UUID
);

CREATE OR REPLACE FUNCTION public.assign_medals_on_completion(
    user_id UUID,
    chapter_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    total_questions INTEGER;
    correct_answers INTEGER;
    percentage NUMERIC;
    medal TEXT;
    user_exists BOOLEAN;
    chapter_exists BOOLEAN;
BEGIN
    -- Prüfe ob Benutzer existiert
    SELECT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = user_id
    ) INTO user_exists;
    
    IF NOT user_exists THEN
        RETURN jsonb_build_object('status', 'error', 'message', '❌ Benutzer nicht gefunden');
    END IF;

    -- Prüfe ob Kapitel existiert
    SELECT EXISTS (
        SELECT 1 FROM chapters 
        WHERE id = chapter_id
    ) INTO chapter_exists;
    
    IF NOT chapter_exists THEN
        RETURN jsonb_build_object('status', 'error', 'message', '❌ Kapitel nicht gefunden');
    END IF;

    -- Gesamtzahl der Fragen im Kapitel
    SELECT COUNT(*) INTO total_questions
    FROM questions
    WHERE chapter_id = assign_medals_on_completion.chapter_id;

    IF total_questions = 0 THEN
        RETURN jsonb_build_object(
            'status', 'error',
            'message', '❌ Keine Fragen in diesem Kapitel',
            'chapter_id', chapter_id
        );
    END IF;

    -- Anzahl richtiger Antworten des Nutzers in diesem Kapitel
    SELECT COUNT(*) INTO correct_answers
    FROM answered_questions aq
    JOIN questions q ON aq.question_id = q.id
    WHERE q.chapter_id = assign_medals_on_completion.chapter_id
        AND aq.user_id = assign_medals_on_completion.user_id
        AND aq.is_correct = TRUE;

    percentage := (correct_answers * 100.0) / total_questions;

    -- Medaille bestimmen
    IF percentage >= 100 THEN
        medal := 'gold';
    ELSIF percentage >= 75 THEN
        medal := 'silver';
    ELSIF percentage >= 50 THEN
        medal := 'bronze';
    ELSE
        RETURN jsonb_build_object(
            'status', 'info',
            'message', '❌ Keine Medaille vergeben',
            'percentage', percentage,
            'required_for_bronze', 50
        );
    END IF;

    -- Nur eintragen, wenn noch nicht vorhanden oder niedrigerwertig
    INSERT INTO user_medals (user_id, chapter_id, medal)
    VALUES (assign_medals_on_completion.user_id, assign_medals_on_completion.chapter_id, medal)
    ON CONFLICT (user_id, chapter_id) DO UPDATE
    SET medal = CASE
        WHEN EXCLUDED.medal = 'gold' THEN 'gold'
        WHEN EXCLUDED.medal = 'silver' AND user_medals.medal = 'bronze' THEN 'silver'
        WHEN EXCLUDED.medal = 'bronze' AND user_medals.medal IS NULL THEN 'bronze'
        ELSE user_medals.medal
    END;

    RETURN jsonb_build_object(
        'status', 'success',
        'message', '✅ Medaille vergeben',
        'medal', medal,
        'percentage', percentage,
        'total_questions', total_questions,
        'correct_answers', correct_answers
    );
END;
$$;
