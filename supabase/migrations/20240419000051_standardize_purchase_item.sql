-- Migration: Standardisiere purchase_item Funktion
-- Datum: 2024-04-19
-- Beschreibung: 
--   - Fügt Fehlerbehandlung hinzu
--   - Verbessert die Dokumentation
--   - Ändert den Rückgabetyp zu JSONB
--   - Fügt detailliertere Rückgabewerte hinzu

DROP FUNCTION IF EXISTS public.purchase_item(
    user_id UUID,
    item_id UUID,
    quantity INTEGER
);

CREATE OR REPLACE FUNCTION public.purchase_item(
    user_id UUID,
    item_id UUID,
    quantity INTEGER DEFAULT 1
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    item_price INTEGER;
    user_coins INTEGER;
    current_quantity INTEGER;
    user_exists BOOLEAN;
    item_exists BOOLEAN;
    total_price INTEGER;
BEGIN
    -- Prüfe ob Benutzer existiert
    SELECT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = user_id
    ) INTO user_exists;
    
    IF NOT user_exists THEN
        RETURN jsonb_build_object('status', 'error', 'message', '❌ Benutzer nicht gefunden');
    END IF;

    -- Prüfe ob Item existiert und hole Preis
    SELECT EXISTS (
        SELECT 1 FROM items 
        WHERE id = item_id
    ) INTO item_exists;
    
    IF NOT item_exists THEN
        RETURN jsonb_build_object('status', 'error', 'message', '❌ Item existiert nicht');
    END IF;

    -- Hole Item-Preis
    SELECT price INTO item_price 
    FROM items 
    WHERE id = item_id;

    -- Berechne Gesamtpreis
    total_price := item_price * quantity;

    -- Hole Benutzer-Coins
    SELECT coins INTO user_coins 
    FROM profiles 
    WHERE id = user_id;

    -- Prüfe ob genug Coins vorhanden
    IF user_coins < total_price THEN
        RETURN jsonb_build_object(
            'status', 'error',
            'message', '❌ Nicht genug Coins',
            'required', total_price,
            'available', user_coins
        );
    END IF;

    -- Ziehe Coins ab
    UPDATE profiles
    SET coins = coins - total_price
    WHERE id = user_id;

    -- Prüfe ob Item bereits vorhanden
    SELECT quantity INTO current_quantity
    FROM user_items
    WHERE user_id = purchase_item.user_id 
    AND item_id = purchase_item.item_id;

    IF FOUND THEN
        -- Erhöhe Anzahl wenn Item bereits vorhanden
        UPDATE user_items
        SET quantity = quantity + purchase_item.quantity
        WHERE user_id = purchase_item.user_id 
        AND item_id = purchase_item.item_id;
    ELSE
        -- Füge neues Item hinzu
        INSERT INTO user_items (user_id, item_id, quantity)
        VALUES (purchase_item.user_id, purchase_item.item_id, purchase_item.quantity);
    END IF;

    RETURN jsonb_build_object(
        'status', 'success',
        'message', '✅ Item erfolgreich gekauft',
        'quantity', quantity,
        'total_price', total_price,
        'remaining_coins', user_coins - total_price
    );
END;
$$; 