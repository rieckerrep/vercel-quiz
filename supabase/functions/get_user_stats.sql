-- File: get_user_stats.sql
DROP FUNCTION IF EXISTS get_user_stats(
    p_user_id UUID
);

CREATE OR REPLACE FUNCTION "public"."get_user_stats"("p_user_id" uuid) RETURNS TABLE("xp" integer, "coins" integer, "level" integer, "level_title" "text", "bronze_count" integer, "silver_count" integer, "gold_count" integer, "quiz_streak" integer, "daily_streak" integer)
    LANGUAGE "sql"
    AS $$
  SELECT
    us.total_xp AS xp,
    us.total_coins AS coins,
    us.level,
    l.level_title,
    COUNT(CASE WHEN um.medal = 'bronze' THEN 1 END) AS bronze_count,
    COUNT(CASE WHEN um.medal = 'silver' THEN 1 END) AS silver_count,
    COUNT(CASE WHEN um.medal = 'gold' THEN 1 END) AS gold_count,
    COALESCE(ust.current_streak, 0) AS quiz_streak,
    COALESCE(dst.current_streak, 0) AS daily_streak
  FROM user_stats us
  LEFT JOIN levels l ON us.level = l.id
  LEFT JOIN user_medals um ON um.user_id = us.user_id
  LEFT JOIN user_streaks ust ON ust.user_id = us.user_id
  LEFT JOIN daily_streaks dst ON dst.user_id = us.user_id
  WHERE us.user_id = get_user_stats.p_user_id
  GROUP BY us.total_xp, us.total_coins, us.level, l.level_title, ust.current_streak, dst.current_streak;
$$;
