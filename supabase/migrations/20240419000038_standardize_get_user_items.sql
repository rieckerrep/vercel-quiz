-- Migration: Standardisierung der get_user_items Funktion
-- Beschreibung: Verbesserung der Dokumentation, Formatierung und Fehlerbehandlung

-- Funktion zum Abrufen der Items eines Benutzers
-- Parameter:
--   user_id: UUID des Benutzers
-- Rückgabewert: Tabelle mit allen Items des Benutzers und deren Details

DROP FUNCTION IF EXISTS public.get_user_items(
    user_id UUID
);

CREATE OR REPLACE FUNCTION public.get_user_items(
    user_id UUID
) RETURNS TABLE (
    item_id UUID,
    name TEXT,
    type TEXT,
    icon_url TEXT,
    quantity INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
    user_exists BOOLEAN;
BEGIN
    -- Prüfe ob Benutzer existiert
    SELECT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = user_id
    ) INTO user_exists;
    
    IF NOT user_exists THEN
        RAISE EXCEPTION '❌ Benutzer nicht gefunden';
    END IF;

    -- Gebe Items zurück
    RETURN QUERY
    SELECT
        i.id AS item_id,
        i.name,
        i.type,
        i.icon_url,
        ui.quantity
    FROM user_items ui
    JOIN items i ON ui.item_id = i.id
    WHERE ui.user_id = get_user_items.user_id;
END;
$$; 