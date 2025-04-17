-- File: get_player_leaderboard.sql
DROP FUNCTION IF EXISTS get_player_leaderboard(
    p_limit INTEGER DEFAULT 10
);

CREATE OR REPLACE FUNCTION "public"."get_player_leaderboard"("p_limit" integer DEFAULT 10) RETURNS TABLE("user_id" uuid, "username" text, "total_xp" integer)
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
    SELECT p.username,
           s.total_xp AS xp
    FROM user_stats s
    JOIN profiles p ON p.id = s.user_id
    ORDER BY s.total_xp DESC
    LIMIT p_limit
$$;
