-- File: is_quiz_completed.sql
-- Funktion zum Prüfen, ob ein Quiz/Kapitel vollständig beantwortet wurde
-- Parameter:
--   user_id: UUID des Benutzers
--   chapter_id: ID des Kapitels
-- Rückgabewert: TRUE wenn alle Fragen des Kapitels beantwortet wurden, sonst FALSE

DROP FUNCTION IF EXISTS public.is_quiz_completed(
    user_id UUID,
    chapter_id BIGINT
);

CREATE OR REPLACE FUNCTION public.is_quiz_completed(
    user_id UUID,
    chapter_id BIGINT
) RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    user_exists BOOLEAN;
    chapter_exists BOOLEAN;
    total_questions INTEGER;
    answered_questions INTEGER;
BEGIN
    -- Prüfe ob Benutzer existiert
    SELECT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = user_id
    ) INTO user_exists;
    
    IF NOT user_exists THEN
        RAISE EXCEPTION '❌ Benutzer nicht gefunden';
    END IF;

    -- Prüfe ob Kapitel existiert
    SELECT EXISTS (
        SELECT 1 FROM chapters 
        WHERE id = chapter_id
    ) INTO chapter_exists;
    
    IF NOT chapter_exists THEN
        RAISE EXCEPTION '❌ Kapitel nicht gefunden';
    END IF;

    -- Zähle Gesamtanzahl der Fragen im Kapitel
    SELECT COUNT(*) 
    INTO total_questions
    FROM questions 
    WHERE chapter_id = is_quiz_completed.chapter_id;

    -- Zähle beantwortete Fragen
    SELECT COUNT(DISTINCT aq.question_id)
    INTO answered_questions
    FROM questions q
    LEFT JOIN answered_questions aq 
        ON q.id = aq.question_id 
        AND aq.user_id = is_quiz_completed.user_id
    WHERE q.chapter_id = is_quiz_completed.chapter_id;

    -- Quiz ist komplett wenn alle Fragen beantwortet wurden
    RETURN total_questions = answered_questions;
END;
$$;
