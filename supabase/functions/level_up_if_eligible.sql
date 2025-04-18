-- File: level_up_if_eligible.sql
CREATE OR REPLACE FUNCTION "public"."level_up_if_eligible"("p_user_id" "uuid") RETURNS TABLE("new_level" integer, "did_level_up" boolean, "level_title" "text", "level_image" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_new_level integer;
  v_old_level integer;
BEGIN
  -- Aktuelles Level speichern
  SELECT COALESCE(level, 0) INTO v_old_level
  FROM public.user_stats
  WHERE user_id = p_user_id;

  -- Neues Level berechnen
  SELECT public.get_level(p_user_id) INTO v_new_level;

  -- Nur updaten wenn Level-Up
  IF v_new_level > v_old_level THEN
    UPDATE public.user_stats
    SET level = v_new_level
    WHERE user_id = p_user_id;
  END IF;

  -- Ergebnis mit Level-Details zurückgeben
  RETURN QUERY
  SELECT 
    v_new_level as new_level,
    (v_new_level > v_old_level) as did_level_up,
    l.level_title,              -- aus schema_.sql
    l.level_image               -- aus schema_.sql
  FROM public.levels l
  WHERE l.level_number = v_new_level;

END;
$$;
