-- File: get_reward_status.sql
CREATE OR REPLACE FUNCTION "public"."get_reward_status"("p_user_id" "uuid", "p_context_id" "uuid") RETURNS TABLE("question_type" "text", "reward_type" "text", "is_rewarded" boolean, "xp_earned" integer, "coins_earned" integer)
    LANGUAGE "sql" STABLE
    AS $$
  SELECT
    rt.question_type,
    rt.reward_type,
    (ar.id IS NOT NULL)           AS is_rewarded,
    COALESCE(ar.xp_earned,0)      AS xp_earned,
    COALESCE(ar.coins_earned,0)   AS coins_earned
  FROM public.reward_types rt
  LEFT JOIN public.answered_rewards ar
    ON ar.reward_type_id      = rt.id
   AND ar.user_id             = p_user_id
   AND ar.question_context_id = p_context_id
  ORDER BY rt.question_type;
$$;
