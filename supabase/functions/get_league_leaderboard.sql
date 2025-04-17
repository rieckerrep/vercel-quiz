-- File: get_league_leaderboard.sql
DROP FUNCTION IF EXISTS get_league_leaderboard(
    p_league_id INTEGER
);

CREATE OR REPLACE FUNCTION "public"."get_league_leaderboard"("p_league_id" integer) RETURNS TABLE("user_id" uuid, "username" text, "score" integer)
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
    SELECT p.username,
           s.total_xp AS xp
    FROM user_stats s
    JOIN profiles p ON p.id = s.user_id
    WHERE s.current_league = league_name
    ORDER BY s.total_xp DESC
$$;
