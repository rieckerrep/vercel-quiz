-- File: has_answered.sql
-- Funktion zum Prüfen, ob ein Benutzer eine Frage bereits beantwortet hat
-- Parameter:
--   user_id: UUID des Benutzers
--   question_id: ID der Frage
-- Rückgabewert: TRUE wenn die Frage bereits beantwortet wurde, sonst FALSE

DROP FUNCTION IF EXISTS public.has_answered(
    user_id UUID,
    question_id BIGINT
);

CREATE OR REPLACE FUNCTION public.has_answered(
    user_id UUID,
    question_id BIGINT
) RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    user_exists BOOLEAN;
    question_exists BOOLEAN;
BEGIN
    -- Prüfe ob Benutzer existiert
    SELECT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = user_id
    ) INTO user_exists;
    
    IF NOT user_exists THEN
        RAISE EXCEPTION '❌ Benutzer nicht gefunden';
    END IF;

    -- Prüfe ob Frage existiert
    SELECT EXISTS (
        SELECT 1 FROM questions 
        WHERE id = question_id
    ) INTO question_exists;
    
    IF NOT question_exists THEN
        RAISE EXCEPTION '❌ Frage nicht gefunden';
    END IF;

    -- Prüfe ob Frage beantwortet wurde
    RETURN EXISTS (
        SELECT 1 
        FROM answered_questions
        WHERE user_id = has_answered.user_id
        AND question_id = has_answered.question_id
    );
END;
$$;
