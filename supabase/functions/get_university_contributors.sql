-- File: get_university_contributors.sql
DROP FUNCTION IF EXISTS get_university_contributors(
    p_university_id UUID
);

CREATE OR REPLACE FUNCTION "public"."get_university_contributors"("p_university_id" uuid) RETURNS TABLE("user_id" uuid, "username" text, "contribution" integer)
    LANGUAGE "sql"
    AS $$
    SELECT 
        COALESCE(p.username, us.username) as username,
        COALESCE(us.total_xp, 0) as total_xp,
        p.id as user_id
    FROM profiles p
    LEFT JOIN user_stats us ON p.id = us.user_id
    WHERE p.university = uni_name
    ORDER BY us.total_xp DESC NULLS LAST;
$$;
