-- File: use_item.sql
CREATE OR REPLACE FUNCTION "public"."use_item"("p_user_id" "uuid", "p_item_id" "uuid", "p_metadata" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_quantity integer;
  v_now      timestamp := now();
  v_response jsonb;
BEGIN
  -- 1) Prüfen, ob Item aktiv und vorhanden ist
  SELECT quantity INTO v_quantity
  FROM public.user_items
  WHERE user_id = p_user_id AND item_id = p_item_id AND is_active = true;

  IF v_quantity IS NULL OR v_quantity < 1 THEN
    RETURN jsonb_build_object('error','Item nicht verfügbar');
  END IF;

  -- 2) Quantity verringern und ggf. deaktivieren
  UPDATE public.user_items
  SET quantity = quantity - 1,
      is_active = (quantity - 1 > 0)
  WHERE user_id = p_user_id AND item_id = p_item_id;

  -- 3) Loggen
  INSERT INTO public.item_usage_log(user_id,item_id,used_at,metadata)
  VALUES(p_user_id,p_item_id,v_now,p_metadata);

  v_response := jsonb_build_object('status','used');
  RETURN v_response;
END;
$$;
