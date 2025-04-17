-- File: update_level_on_xp_change.sql
CREATE OR REPLACE FUNCTION "public"."update_level_on_xp_change"("user_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$DECLARE
  user_xp INTEGER;
  best_level_id INTEGER;
  current_level_id INTEGER;
BEGIN
  -- Aktuelle XP holen
  SELECT xp INTO user_xp
  FROM user_stats
  WHERE user_id = user_id;

  -- Bestmögliches Level ermitteln (alle Levels, die die XP-Schwelle erfüllen)
  SELECT id INTO best_level_id
  FROM levels
  WHERE xp_required <= user_xp
  ORDER BY xp_required DESC
  LIMIT 1;

  -- Aktuelles Level holen
  SELECT level_id INTO current_level_id
  FROM user_stats
  WHERE user_id = user_id;

  -- Nur aktualisieren, wenn höher
  IF best_level_id IS NOT NULL AND best_level_id > current_level_id THEN
    UPDATE user_stats
    SET level_id = best_level_id
    WHERE user_id = user_id;

    RETURN '🏆 Level up auf ' || best_level_id;
  END IF;

  RETURN 'ℹ️ Level bleibt gleich';
END;$$;


ALTER FUNCTION "public"."update_level_on_xp_change"("user_id" "uuid") OWNER TO "postgres";


