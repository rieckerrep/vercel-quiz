-- File: get_level_info.sql
CREATE OR REPLACE FUNCTION "public"."get_level_info"("p_user_id" "uuid") RETURNS TABLE("level_number" integer, "level_title" "text", "level_image" "text", "total_xp" bigint, "next_level_xp" bigint, "progress_percent" integer)
    LANGUAGE "sql" STABLE
    AS $$
WITH user_level AS (
  SELECT 
    us.total_xp,
    l.level_number,
    l.level_title,
    l.level_image,
    LEAD(l.xp_required) OVER (ORDER BY l.level_number) as next_level_xp,
    l.xp_required
  FROM public.user_stats us
  JOIN public.levels l ON us.total_xp >= l.xp_required
  WHERE us.user_id = p_user_id
  ORDER BY l.xp_required DESC
  LIMIT 1
)
SELECT
  level_number,
  level_title,
  level_image,
  total_xp,
  next_level_xp,
  CASE 
    WHEN next_level_xp IS NULL THEN 100
    ELSE ((total_xp - xp_required)::float / (next_level_xp - xp_required)::float * 100)::integer
  END as progress_percent
FROM user_level;
$$;
