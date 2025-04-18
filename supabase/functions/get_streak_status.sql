-- File: get_streak_status.sql
CREATE OR REPLACE FUNCTION "public"."get_streak_status"("p_user_id" "uuid") RETURNS TABLE("current_streak" integer, "last_active_date" "date", "max_streak" integer)
    LANGUAGE "sql" STABLE
    AS $$
SELECT
  COALESCE(current_streak, 0),
  last_active_date,
  COALESCE(max_streak, 0)
FROM public.daily_streaks
WHERE user_id = p_user_id;
$$;
