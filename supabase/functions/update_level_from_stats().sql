-- File: update_level_from_stats().sql
CREATE OR REPLACE FUNCTION "public"."update_level_from_stats()"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$BEGIN
  -- Suche das höchste Level, dessen xp_required <= NEW.total_xp
  SELECT level_number
    INTO NEW.level
    FROM levels
    WHERE xp_required <= NEW.total_xp
    ORDER BY xp_required DESC
    LIMIT 1;

  RETURN NEW;
END;$$;


ALTER FUNCTION "public"."update_level_from_stats()"() OWNER TO "postgres";


