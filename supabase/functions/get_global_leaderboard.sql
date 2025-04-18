-- File: get_global_leaderboard.sql
CREATE OR REPLACE FUNCTION "public"."get_global_leaderboard"("p_limit" integer DEFAULT 10) RETURNS TABLE("user_id" "uuid", "total_xp" bigint)
    LANGUAGE "sql" STABLE
    AS $$
SELECT
  us.user_id,
  us.total_xp
FROM public.user_stats us
ORDER BY us.total_xp DESC
LIMIT p_limit;
$$;
