-- File: get_university_ranking.sql
CREATE OR REPLACE FUNCTION "public"."get_university_ranking"() RETURNS TABLE("university_id" bigint, "name" "text", "score" bigint, "rank" bigint, "month" "date")
    LANGUAGE "sql" STABLE
    AS $$
SELECT 
    m.university_id,
    u.name,                -- ✅ korrekt aus universities
    m.score,
    RANK() OVER (PARTITION BY m.month ORDER BY m.score DESC) as rank,
    m.month
FROM public.monthly_uni_scores m
JOIN public.universities u ON u.id = m.university_id
WHERE m.month = date_trunc('month', current_date)
ORDER BY rank;
$$;
