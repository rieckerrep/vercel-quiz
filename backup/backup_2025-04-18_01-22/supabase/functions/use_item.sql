-- File: use_item.sql
CREATE OR REPLACE FUNCTION "public"."use_item"("user_id" "uuid", "item_id" "uuid", "question_id" bigint) RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  remaining INTEGER;
BEGIN
  -- Check: hat der User das Item überhaupt?
  SELECT quantity INTO remaining
  FROM user_items
  WHERE user_id = user_id AND item_id = item_id;

  IF remaining IS NULL OR remaining <= 0 THEN
    RETURN '🚫 Kein Item vorhanden';
  END IF;

  -- Item verbrauchen
  UPDATE user_items
  SET quantity = quantity - 1
  WHERE user_id = user_id AND item_id = item_id;

  RETURN '✅ Item verwendet';
END;
$$;
