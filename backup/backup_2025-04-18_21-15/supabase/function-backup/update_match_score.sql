-- File: update_match_score.sql
-- Funktion zum Aktualisieren des Match-Scores
-- Parameter:
--   match_id: UUID des Matches
--   user_id: UUID des Spielers
--   is_correct: Ob die Antwort korrekt war
-- Rückgabewert: void (keine Rückgabe)

DROP FUNCTION IF EXISTS public.update_match_score(
    match_id UUID,
    user_id UUID,
    is_correct BOOLEAN
);

CREATE OR REPLACE FUNCTION public.update_match_score(
    match_id UUID,
    user_id UUID,
    is_correct BOOLEAN
) RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    match_exists BOOLEAN;
    participant_exists BOOLEAN;
BEGIN
    -- Prüfe ob Match existiert
    SELECT EXISTS (
        SELECT 1 FROM pvp_matches 
        WHERE id = match_id
    ) INTO match_exists;
    
    IF NOT match_exists THEN
        RAISE EXCEPTION '❌ Match nicht gefunden';
    END IF;

    -- Prüfe ob Spieler Teilnehmer ist
    SELECT EXISTS (
        SELECT 1 FROM pvp_participants 
        WHERE match_id = match_id 
        AND user_id = user_id
    ) INTO participant_exists;
    
    IF NOT participant_exists THEN
        RAISE EXCEPTION '❌ Spieler ist kein Teilnehmer des Matches';
    END IF;

    -- Punktestand für den Spieler aktualisieren
    UPDATE pvp_participants
    SET score = score + CASE 
        WHEN is_correct THEN 10 
        ELSE 0 
    END
    WHERE match_id = match_id 
    AND user_id = user_id;
END;
$$;
