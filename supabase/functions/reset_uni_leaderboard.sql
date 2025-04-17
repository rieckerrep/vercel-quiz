-- File: reset_uni_leaderboard.sql
DROP FUNCTION IF EXISTS reset_uni_leaderboard();

CREATE OR REPLACE FUNCTION "public"."reset_uni_leaderboard"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Beispiel: Setze das monatliche Score-Feld zurück
  UPDATE universities
  SET monthly_uni_scores = 0;
  
  RAISE NOTICE 'University leaderboard has been reset.';
END;
$$;
