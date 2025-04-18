-- File: submit_pvp_answer.sql
-- Funktion zur Verarbeitung einer PvP-Antwort
-- Parameter:
--   user_id: UUID des antwortenden Spielers
--   match_id: UUID des PvP-Matches
--   question_id: UUID der beantworteten Frage
--   is_correct: Ob die Antwort korrekt war
-- Rückgabewert: Statusmeldung als Text

DROP FUNCTION IF EXISTS public.submit_pvp_answer(
    user_id UUID,
    match_id UUID,
    question_id UUID,
    is_correct BOOLEAN
);

CREATE OR REPLACE FUNCTION public.submit_pvp_answer(
    user_id UUID,
    match_id UUID,
    question_id UUID,
    is_correct BOOLEAN
) RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    match_exists BOOLEAN;
    already_answered BOOLEAN;
BEGIN
    -- Prüfe ob Match existiert
    SELECT EXISTS (
        SELECT 1 FROM pvp_matches 
        WHERE id = match_id
    ) INTO match_exists;
    
    IF NOT match_exists THEN
        RETURN '❌ Match nicht gefunden';
    END IF;

    -- Anti-Farming: Prüfe ob Frage bereits beantwortet
    SELECT EXISTS (
        SELECT 1 FROM pvp_answers
        WHERE match_id = match_id 
        AND user_id = user_id 
        AND question_id = question_id
    ) INTO already_answered;

    IF already_answered THEN
        RETURN '🚫 Frage bereits beantwortet';
    END IF;

    -- Antwort speichern
    INSERT INTO pvp_answers (
        match_id,
        user_id,
        question_id,
        is_correct
    ) VALUES (
        match_id,
        user_id,
        question_id,
        is_correct
    );

    -- Bei korrekter Antwort Punkte vergeben
    IF is_correct THEN
        UPDATE pvp_participants
        SET score = score + 10
        WHERE match_id = match_id 
        AND user_id = user_id;
    END IF;

    RETURN '✅ Antwort erfolgreich verarbeitet';
END;
$$;
