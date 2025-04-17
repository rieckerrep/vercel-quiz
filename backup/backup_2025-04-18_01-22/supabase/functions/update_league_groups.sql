-- File: update_league_groups.sql
CREATE OR REPLACE FUNCTION "public"."update_league_groups"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  WITH ranked AS (
    SELECT 
      user_id,
      current_league,  -- z. B. "Holzliga", "Bronzeliga" etc.
      ROW_NUMBER() OVER (PARTITION BY current_league ORDER BY total_xp DESC) AS rn
    FROM user_stats
  )
  UPDATE user_stats us
  SET league_group = CONCAT(us.current_league, ' ', CEIL(r.rn::numeric / 30))
  FROM ranked r
  WHERE us.user_id = r.user_id;
END;
$$;
