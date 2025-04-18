-- Migration: Standardisierung der start_pvp_match Funktion
-- Beschreibung: Verbesserung der Dokumentation, Formatierung und Fehlerbehandlung

-- Funktion zum Starten eines PvP-Matches
-- Parameter:
--   user_id: UUID des anfragenden Spielers
--   opponent_id: UUID des Gegners
-- Rückgabewert: UUID des erstellten Matches

DROP FUNCTION IF EXISTS public.start_pvp_match(
    user_id UUID,
    opponent_id UUID
);

CREATE OR REPLACE FUNCTION public.start_pvp_match(
    user_id UUID,
    opponent_id UUID
) RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    new_match_id UUID;
    user_exists BOOLEAN;
    opponent_exists BOOLEAN;
BEGIN
    -- Prüfe ob beide Spieler existieren
    SELECT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = user_id
    ) INTO user_exists;
    
    SELECT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = opponent_id
    ) INTO opponent_exists;
    
    IF NOT user_exists OR NOT opponent_exists THEN
        RAISE EXCEPTION '❌ Einer der Spieler existiert nicht';
    END IF;

    -- Erstelle neues Match
    INSERT INTO pvp_matches (
        status,
        mode
    ) VALUES (
        'active',
        'classic'  -- Standardmodus für PvP-Matches
    )
    RETURNING id INTO new_match_id;

    -- Füge beide Spieler als Teilnehmer hinzu
    INSERT INTO pvp_participants (
        match_id,
        user_id,
        hp,
        score
    ) VALUES 
    (new_match_id, user_id, 100, 0),
    (new_match_id, opponent_id, 100, 0);

    RETURN new_match_id;
END;
$$; 