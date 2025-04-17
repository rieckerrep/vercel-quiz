-- File: get_streaks.sql
DROP FUNCTION IF EXISTS get_streaks(
    p_user_id UUID
);

CREATE OR REPLACE FUNCTION "public"."get_streaks"("p_user_id" uuid) RETURNS jsonb
    LANGUAGE "sql"
    AS $$
  SELECT
    COALESCE(us.current_streak, 0) AS quiz_streak,
    COALESCE(ds.current_streak, 0) AS daily_streak,
    us.last_updated,
    ds.last_active_date
  FROM profiles p
  LEFT JOIN user_streaks us ON us.user_id = p.id
  LEFT JOIN daily_streaks ds ON ds.user_id = p.id
  WHERE p.id = get_streaks.p_user_id;
$$;
