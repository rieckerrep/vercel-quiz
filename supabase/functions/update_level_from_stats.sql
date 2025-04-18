-- File: update_level_from_stats.sql
-- Trigger-Funktion zum Aktualisieren des Levels basierend auf XP
-- Wird automatisch ausgeführt, wenn sich total_xp in user_stats ändert
-- Setzt das Level auf den höchsten Wert, dessen XP-Anforderung erfüllt ist

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