-- File: get_university_leaderboard.sql
DROP FUNCTION IF EXISTS get_university_leaderboard(
    p_limit INTEGER DEFAULT 10
);

CREATE OR REPLACE FUNCTION "public"."get_university_leaderboard"("p_limit" integer DEFAULT 10) RETURNS TABLE("university_id" uuid, "university_name" text, "total_score" integer)
    LANGUAGE "sql"
    AS $$
    SELECT 
        p.university,
        COALESCE(SUM(us.total_xp), 0) as xp_sum
    FROM profiles p
    LEFT JOIN user_stats us ON p.id = us.user_id
    WHERE p.university IS NOT NULL
    GROUP BY p.university
    ORDER BY xp_sum DESC;
$$;
