-- File: purchase_item.sql
CREATE OR REPLACE FUNCTION "public"."purchase_item"("p_user_id" "uuid", "p_item_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_price      integer;
  v_coins      integer;
  v_quantity   integer;
  v_now        timestamp := now();
  v_response   jsonb;
BEGIN
  -- 1) Preis und aktuelle Coins abrufen
  SELECT i.price INTO v_price FROM public.items i WHERE i.id = p_item_id;
  SELECT total_coins INTO v_coins FROM public.user_stats WHERE user_id = p_user_id;

  IF v_coins < v_price THEN
    RETURN jsonb_build_object('error','Nicht genug Coins');
  END IF;

  -- 2) Coins abziehen
  UPDATE public.user_stats
  SET total_coins = total_coins - v_price
  WHERE user_id = p_user_id;

  -- 3) Item ins Inventar legen / Quantity erhöhen
  SELECT quantity INTO v_quantity
  FROM public.user_items
  WHERE user_id = p_user_id AND item_id = p_item_id;

  IF FOUND THEN
    UPDATE public.user_items
    SET quantity = quantity + 1
    WHERE user_id = p_user_id AND item_id = p_item_id;
  ELSE
    INSERT INTO public.user_items(user_id,item_id,quantity,is_active,acquired_at)
    VALUES(p_user_id,p_item_id,1,true,v_now);
  END IF;

  -- 4) Antwort zurückgeben
  v_response := jsonb_build_object(
    'status', 'success',
    'remaining_coins', (v_coins - v_price)
  );
  RETURN v_response;
END;
$$;
