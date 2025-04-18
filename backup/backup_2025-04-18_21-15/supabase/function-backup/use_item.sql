-- File: use_item.sql
-- Funktion zum Verwenden eines Items
-- Parameter:
--   user_id: UUID des Benutzers
--   item_id: UUID des Items
--   question_id: ID der Frage, für die das Item verwendet wird
-- Rückgabewert: JSONB mit Status und Details der Item-Verwendung

DROP FUNCTION IF EXISTS public.use_item(
    user_id UUID,
    item_id UUID,
    question_id BIGINT
);

CREATE OR REPLACE FUNCTION public.use_item(
    user_id UUID,
    item_id UUID,
    question_id BIGINT
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    remaining INTEGER;
    user_exists BOOLEAN;
    item_exists BOOLEAN;
    question_exists BOOLEAN;
BEGIN
    -- Prüfe ob Benutzer existiert
    SELECT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = user_id
    ) INTO user_exists;
    
    IF NOT user_exists THEN
        RETURN jsonb_build_object('status', 'error', 'message', '❌ Benutzer nicht gefunden');
    END IF;

    -- Prüfe ob Item existiert
    SELECT EXISTS (
        SELECT 1 FROM items 
        WHERE id = item_id
    ) INTO item_exists;
    
    IF NOT item_exists THEN
        RETURN jsonb_build_object('status', 'error', 'message', '❌ Item existiert nicht');
    END IF;

    -- Prüfe ob Frage existiert
    SELECT EXISTS (
        SELECT 1 FROM questions 
        WHERE id = question_id
    ) INTO question_exists;
    
    IF NOT question_exists THEN
        RETURN jsonb_build_object('status', 'error', 'message', '❌ Frage nicht gefunden');
    END IF;

    -- Prüfe ob Item vorhanden ist
    SELECT quantity INTO remaining
    FROM user_items
    WHERE user_id = use_item.user_id 
    AND item_id = use_item.item_id;

    IF remaining IS NULL OR remaining <= 0 THEN
        RETURN jsonb_build_object(
            'status', 'error',
            'message', '❌ Kein Item vorhanden',
            'item_id', item_id
        );
    END IF;

    -- Item verbrauchen
    UPDATE user_items
    SET quantity = quantity - 1
    WHERE user_id = use_item.user_id 
    AND item_id = use_item.item_id;

    RETURN jsonb_build_object(
        'status', 'success',
        'message', '✅ Item erfolgreich verwendet',
        'item_id', item_id,
        'question_id', question_id,
        'remaining_quantity', remaining - 1
    );
END;
$$;
