-- Migration: Standardisierung der finalize_pvp_match Funktion
-- Beschreibung: Verbesserung der Dokumentation, Formatierung und Fehlerbehandlung

-- Funktion zum Abschließen eines PvP-Matches
-- Parameter:
--   match_id: UUID des zu beendenden Matches
-- Rückgabewert: Statusmeldung als Text

DROP FUNCTION IF EXISTS public.finalize_pvp_match(
    match_id UUID
);

CREATE OR REPLACE FUNCTION public.finalize_pvp_match(
    match_id UUID
) RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    p1_id UUID;
    p2_id UUID;
    p1_hp INTEGER;
    p2_hp INTEGER;
    winner_id UUID;
    loser_id UUID;
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

    -- Prüfe ob Match bereits beendet
    IF EXISTS (
        SELECT 1 FROM pvp_matches 
        WHERE id = match_id 
        AND status = 'finished'
    ) THEN
        RETURN '🚫 Match wurde bereits abgeschlossen';
    END IF;

    -- Teilnehmer ermitteln
    SELECT user_id INTO p1_id 
    FROM pvp_participants 
    WHERE match_id = match_id 
    LIMIT 1;

    SELECT user_id INTO p2_id 
    FROM pvp_participants 
    WHERE match_id = match_id 
    AND user_id != p1_id;

    -- HP beider Spieler ermitteln
    SELECT hp INTO p1_hp 
    FROM pvp_participants 
    WHERE match_id = match_id 
    AND user_id = p1_id;

    SELECT hp INTO p2_hp 
    FROM pvp_participants 
    WHERE match_id = match_id 
    AND user_id = p2_id;

    -- Sieger bestimmen
    IF p1_hp > p2_hp THEN
        winner_id := p1_id;
        loser_id := p2_id;
    ELSIF p2_hp > p1_hp THEN
        winner_id := p2_id;
        loser_id := p1_id;
    END IF;

    -- Match als beendet markieren
    UPDATE pvp_matches 
    SET status = 'finished' 
    WHERE id = match_id;

    -- XP und Coins vergeben
    IF winner_id IS NOT NULL THEN
        -- Gewinner
        UPDATE user_stats 
        SET total_xp = total_xp + 50,
            total_coins = total_coins + 50 
        WHERE user_id = winner_id;
        
        -- Verlierer
        UPDATE user_stats 
        SET total_xp = total_xp + 20,
            total_coins = total_coins + 20 
        WHERE user_id = loser_id;
    ELSE
        -- Unentschieden
        UPDATE user_stats 
        SET total_xp = total_xp + 30,
            total_coins = total_coins + 30
        WHERE user_id IN (p1_id, p2_id);
    END IF;

    RETURN '✅ Match erfolgreich abgeschlossen';
END;
$$; 