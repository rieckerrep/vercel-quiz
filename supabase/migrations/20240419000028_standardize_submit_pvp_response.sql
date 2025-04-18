-- Migration: Standardisierung der submit_pvp_response Funktion
-- Beschreibung: Verbesserung der Dokumentation, Formatierung und Fehlerbehandlung

-- Funktion zur Verarbeitung einer PvP-Antwort
-- Parameter:
--   user_id: UUID des antwortenden Spielers
--   match_id: UUID des PvP-Matches
--   question_id: ID der beantworteten Frage
--   is_correct: Ob die Antwort korrekt war
--   response_time_ms: Antwortzeit in Millisekunden
-- Rückgabewert: Statusmeldung als Text

DROP FUNCTION IF EXISTS public.submit_pvp_response(
    user_id UUID,
    match_id UUID,
    question_id BIGINT,
    is_correct BOOLEAN,
    response_time_ms INTEGER
);

CREATE OR REPLACE FUNCTION public.submit_pvp_response(
    user_id UUID,
    match_id UUID,
    question_id BIGINT,
    is_correct BOOLEAN,
    response_time_ms INTEGER
) RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    damage_to_enemy INTEGER := 0;
    self_penalty INTEGER := 0;
    opponent_id UUID;
    match_exists BOOLEAN;
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
    IF EXISTS (
        SELECT 1 FROM pvp_responses
        WHERE match_id = match_id 
        AND user_id = user_id 
        AND question_id = question_id
    ) THEN
        RETURN '🚫 Frage bereits beantwortet';
    END IF;

    -- Gegner ermitteln
    SELECT user_id INTO opponent_id
    FROM pvp_participants
    WHERE match_id = match_id 
    AND user_id != user_id;

    -- Schadensberechnung
    IF is_correct THEN
        -- Weniger Zeit = mehr Schaden (Basis: 20 - response_time_ms / 1000 capped)
        damage_to_enemy := GREATEST(10, LEAST(20, 25 - response_time_ms / 1000));
    ELSE
        self_penalty := 10;
    END IF;

    -- Antwort speichern
    INSERT INTO pvp_responses (
        match_id, 
        user_id, 
        question_id, 
        is_correct, 
        damage_done, 
        self_damage
    ) VALUES (
        match_id, 
        user_id, 
        question_id, 
        is_correct, 
        damage_to_enemy, 
        self_penalty
    );

    -- HP aktualisieren
    IF is_correct THEN
        UPDATE pvp_participants
        SET hp = hp - damage_to_enemy
        WHERE match_id = match_id 
        AND user_id = opponent_id;
    ELSE
        UPDATE pvp_participants
        SET hp = hp - self_penalty
        WHERE match_id = match_id 
        AND user_id = user_id;
    END IF;

    RETURN '✅ Antwort erfolgreich verarbeitet';
END;
$$; 