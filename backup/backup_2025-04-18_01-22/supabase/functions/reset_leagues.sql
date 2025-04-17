-- File: reset_leagues.sql
DROP FUNCTION IF EXISTS reset_leagues();

CREATE OR REPLACE FUNCTION "public"."reset_leagues"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  rec RECORD;
  promotion_threshold CONSTANT INTEGER := 10;  -- Top 10
  demotion_threshold CONSTANT INTEGER := 5;    -- Unterste 5
  next_league TEXT;
  prev_league TEXT;
BEGIN
  -- Für jede existierende Liga in user_stats
  FOR rec IN
    SELECT DISTINCT current_league FROM user_stats
  LOOP
    -- Bestimme anhand des aktuellen Liga-Namens, welches die nächsthöhere und nächstniedrigere Liga ist.
    IF rec.current_league = 'Holzliga' THEN
      next_league := 'Bronzeliga';
      prev_league := NULL;  -- Keine Abstufung, da Holzliga die unterste ist.
    ELSIF rec.current_league = 'Bronzeliga' THEN
      next_league := 'Silberliga';
      prev_league := 'Holzliga';
    ELSIF rec.current_league = 'Silberliga' THEN
      next_league := 'Goldliga';
      prev_league := 'Bronzeliga';
    ELSIF rec.current_league = 'Goldliga' THEN
      next_league := 'Platinliga';
      prev_league := 'Silberliga';
    ELSIF rec.current_league = 'Platinliga' THEN
      next_league := 'Champions League';
      prev_league := 'Goldliga';
    ELSE
      next_league := NULL;
      prev_league := NULL;
    END IF;

    -- Befördere die Top 10 (Promotion), sofern es eine nächste Liga gibt:
    IF next_league IS NOT NULL THEN
      WITH ranked AS (
        SELECT user_id, total_xp,
               ROW_NUMBER() OVER (ORDER BY total_xp DESC) as rn
        FROM user_stats
        WHERE current_league = rec.current_league
      )
      UPDATE user_stats
      SET current_league = next_league
      FROM ranked
      WHERE user_stats.user_id = ranked.user_id
        AND ranked.rn <= promotion_threshold;
    END IF;

    -- Stufe die untersten 5 Spieler ab (Demotion), sofern es eine niedrigere Liga gibt:
    IF prev_league IS NOT NULL THEN
      WITH ranked AS (
        SELECT user_id, total_xp,
               ROW_NUMBER() OVER (ORDER BY total_xp ASC) as rn
        FROM user_stats
        WHERE current_league = rec.current_league
      )
      UPDATE user_stats
      SET current_league = prev_league
      FROM ranked
      WHERE user_stats.user_id = ranked.user_id
        AND ranked.rn <= demotion_threshold;
    END IF;
  END LOOP;

  RAISE NOTICE 'Leagues have been reset with promotion/demotion logic applied.';
END;
$$;
