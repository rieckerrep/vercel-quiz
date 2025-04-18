-- File: get_user_profile.sql
CREATE OR REPLACE FUNCTION "public"."get_user_profile"("p_user_id" "uuid") RETURNS "jsonb"
    LANGUAGE "sql" STABLE
    AS $$
WITH level_info AS (
  SELECT * FROM public.get_level_info(p_user_id)
)
SELECT jsonb_build_object(
  'xp',             us.total_xp,
  'coins',          us.total_coins,
  'level',          li.level_number,                   -- ⬅️ Korrigiert von new_level
  'level_title',    li.level_title,
  'level_image',    li.level_image,
  'title',          us.title,
  'current_streak', COALESCE(ds.current_streak, 0),
  'max_streak',     COALESCE(ds.max_streak, 0),
  'avatar_url',     COALESCE(sa.image_url, ''),
  'medals',         jsonb_build_object(
                      'gold',   us.gold_medals,
                      'silver', us.silver_medals,
                      'bronze', us.bronze_medals
                    ),
  'items',          COALESCE((SELECT jsonb_agg(jsonb_build_object(
                      'item_id', ui.item_id,
                      'quantity', ui.quantity
                    ))
                    FROM public.user_items ui
                    WHERE ui.user_id = p_user_id), '[]'::jsonb),
  'questions_answered', us.questions_answered,
  'correct_answers',    us.correct_answers,
  'last_active',        ds.last_active_date
)
FROM public.user_stats us
LEFT JOIN public.daily_streaks ds
  ON ds.user_id = us.user_id
LEFT JOIN public.user_avatars ua
  ON ua.user_id = us.user_id
LEFT JOIN public.shop_avatars sa
  ON sa.id = ua.avatar_id
CROSS JOIN level_info li
WHERE us.user_id = p_user_id;
$$;
