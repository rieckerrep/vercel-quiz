-- Migration: Standardisiere update_level_from_stats Funktion
-- Datum: 2024-04-19
-- Beschreibung: 
--   - Verbessert die Dokumentation
--   - Fügt Fallback auf Level 1 hinzu
--   - Erstellt Trigger für automatische Ausführung
--   - Entfernt veraltete OWNER TO Klausel

DROP FUNCTION IF EXISTS public.update_level_from_stats() CASCADE;

CREATE OR REPLACE FUNCTION public.update_level_from_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Suche das höchste Level, dessen xp_required <= NEW.total_xp
    SELECT level_number
    INTO NEW.level
    FROM levels
    WHERE xp_required <= NEW.total_xp
    ORDER BY xp_required DESC
    LIMIT 1;

    -- Wenn kein Level gefunden wurde, setze auf Level 1
    IF NEW.level IS NULL THEN
        NEW.level := 1;
    END IF;

    RETURN NEW;
END;
$$;

-- Trigger erstellen
DROP TRIGGER IF EXISTS update_level_from_stats_trigger ON user_stats;
CREATE TRIGGER update_level_from_stats_trigger
    BEFORE UPDATE OF total_xp ON user_stats
    FOR EACH ROW
    EXECUTE FUNCTION update_level_from_stats(); 