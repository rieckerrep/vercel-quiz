-- File: update_avatar.sql
CREATE OR REPLACE FUNCTION "public"."update_avatar"("p_user_id" "uuid", "p_avatar_id" bigint) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_image_url text;
BEGIN
  -- Prüfen ob Avatar existiert
  SELECT image_url INTO v_image_url
  FROM public.shop_avatars
  WHERE id = p_avatar_id;
  
  IF v_image_url IS NULL THEN
    RETURN jsonb_build_object('error', 'Avatar nicht gefunden');
  END IF;

  -- Avatar zuweisen
  INSERT INTO public.user_avatars(
    user_id,
    avatar_id
  )
  VALUES (
    p_user_id,
    p_avatar_id
  )
  ON CONFLICT (user_id) DO UPDATE
    SET avatar_id = EXCLUDED.avatar_id;

  RETURN jsonb_build_object(
    'status', 'ok',
    'avatar_id', p_avatar_id,
    'image_url', v_image_url
  );
EXCEPTION 
  WHEN OTHERS THEN
    RETURN jsonb_build_object('error', SQLERRM);
END;
$$;
