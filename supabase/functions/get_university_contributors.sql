-- File: get_university_contributors.sql
CREATE OR REPLACE FUNCTION "public"."get_university_contributors"("p_university_id" bigint, "p_month" "date" DEFAULT "date_trunc"('month'::"text", (CURRENT_DATE)::timestamp with time zone)) RETURNS TABLE("user_id" "uuid", "username" "text", "monthly_xp" bigint, "rank" bigint)
    LANGUAGE "sql" STABLE
    AS $$
SELECT 
    p.id as user_id,
    p.username,
    COALESCE(SUM(ar.xp_earned), 0)::bigint as monthly_xp,
    RANK() OVER (ORDER BY SUM(ar.xp_earned) DESC) as rank
FROM public.profiles p
LEFT JOIN public.answered_rewards ar 
    ON ar.user_id = p.id 
    AND date_trunc('month', ar.created_at) = p_month
WHERE p.university = (p_university_id)::text  -- Cast p_university_id to text
GROUP BY p.id, p.username
ORDER BY monthly_xp DESC;
$$;
