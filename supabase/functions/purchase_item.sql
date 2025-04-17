-- File: purchase_item.sql
DROP FUNCTION IF EXISTS purchase_item(
    p_user_id UUID,
    p_item_id INTEGER,
    p_quantity INTEGER DEFAULT 1
);

CREATE OR REPLACE FUNCTION "public"."purchase_item"("p_user_id" uuid, "p_item_id" integer, "p_quantity" integer DEFAULT 1) RETURNS jsonb
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  item_price INTEGER;
  user_coins INTEGER;
  current_quantity INTEGER;
BEGIN
  -- Preis des Items holen
  SELECT price INTO item_price FROM items WHERE id = p_item_id;
  IF item_price IS NULL THEN
    RETURN jsonb_build_object('status', 'error', 'message', '🚫 Item existiert nicht');
  END IF;

  -- Coins des Nutzers holen
  SELECT coins INTO user_coins FROM profiles WHERE id = p_user_id;
  IF user_coins IS NULL THEN
    RETURN jsonb_build_object('status', 'error', 'message', '🚫 Nutzer nicht gefunden');
  END IF;

  -- Prüfen, ob genug Coins vorhanden sind
  IF user_coins < item_price THEN
    RETURN jsonb_build_object('status', 'error', 'message', '🚫 Nicht genug Coins');
  END IF;

  -- Coins abziehen
  UPDATE profiles
  SET coins = coins - item_price
  WHERE id = p_user_id;

  -- Prüfen, ob Item bereits vorhanden ist
  SELECT quantity INTO current_quantity
  FROM user_items
  WHERE user_id = p_user_id AND item_id = p_item_id;

  IF FOUND THEN
    -- Item existiert → Anzahl erhöhen
    UPDATE user_items
    SET quantity = quantity + p_quantity
    WHERE user_id = p_user_id AND item_id = p_item_id;
  ELSE
    -- Neues Item eintragen
    INSERT INTO user_items (user_id, item_id, quantity)
    VALUES (p_user_id, p_item_id, p_quantity);
  END IF;

  RETURN jsonb_build_object('status', 'success', 'message', '✅ Item erfolgreich gekauft');
END;
$$;
