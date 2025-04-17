-- File: get_university_contributors.sql
DROP FUNCTION IF EXISTS public.get_university_contributors(TEXT);
DROP FUNCTION IF EXISTS get_university_contributors(TEXT);

CREATE OR REPLACE FUNCTION public.get_university_contributors(
    p_university_name TEXT
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_error_message TEXT;
    v_total_contributors INTEGER;
    v_active_contributors INTEGER;
    v_current_month DATE;
    v_university_id INTEGER;
BEGIN
    -- Setze aktuellen Monat
    v_current_month := date_trunc('month', NOW())::DATE;

    -- Prüfe ob Universität existiert
    SELECT id INTO v_university_id
    FROM universities
    WHERE name = p_university_name;

    IF v_university_id IS NULL THEN
        RETURN jsonb_build_object(
            'status', 'error',
            'message', 'Universität nicht gefunden'
        );
    END IF;

    -- Hole Contributor-Statistiken
    SELECT 
        COUNT(DISTINCT p.id),
        COUNT(DISTINCT CASE WHEN us.total_xp > 0 THEN p.id END)
    INTO 
        v_total_contributors,
        v_active_contributors
    FROM profiles p
    LEFT JOIN user_stats us ON us.user_id = p.id
    WHERE p.university = p_university_name;

    -- Rückgabe der Contributor-Liste
    RETURN jsonb_build_object(
        'status', 'success',
        'university', jsonb_build_object(
            'name', p_university_name,
            'total_contributors', v_total_contributors,
            'active_contributors', v_active_contributors,
            'total_xp', (
                SELECT COALESCE(SUM(us.total_xp), 0)
                FROM profiles p
                LEFT JOIN user_stats us ON us.user_id = p.id
                WHERE p.university = p_university_name
            )
        ),
        'all_time_contributors', (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'rank', ROW_NUMBER() OVER (ORDER BY COALESCE(us.total_xp, 0) DESC),
                    'username', p.username,
                    'total_xp', COALESCE(us.total_xp, 0),
                    'correct_answers', COALESCE(us.correct_answers, 0),
                    'accuracy_percentage',
                        CASE 
                            WHEN COALESCE(us.total_answers, 0) > 0 
                            THEN ROUND((us.correct_answers::FLOAT / us.total_answers) * 100)
                            ELSE 0
                        END,
                    'last_active', us.last_played
                )
            )
            FROM profiles p
            LEFT JOIN user_stats us ON us.user_id = p.id
            WHERE p.university = p_university_name
            ORDER BY COALESCE(us.total_xp, 0) DESC
        ),
        'monthly_contributors', (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'rank', ROW_NUMBER() OVER (ORDER BY COALESCE(mus.xp_this_month, 0) DESC),
                    'username', p.username,
                    'monthly_xp', COALESCE(mus.xp_this_month, 0),
                    'contribution_percentage',
                        CASE 
                            WHEN SUM(mus.xp_this_month) OVER () > 0 
                            THEN ROUND((mus.xp_this_month::FLOAT / SUM(mus.xp_this_month) OVER ()) * 100)
                            ELSE 0
                        END,
                    'active_days_this_month', (
                        SELECT COUNT(DISTINCT DATE(aq.answered_at))
                        FROM answered_questions aq
                        WHERE aq.user_id = p.id
                        AND DATE(aq.answered_at) >= v_current_month
                    )
                )
            )
            FROM profiles p
            LEFT JOIN monthly_uni_scores mus ON mus.university_id = v_university_id
                AND mus.month_start = v_current_month
            WHERE p.university = p_university_name
            AND (mus.xp_this_month > 0 OR mus.xp_this_month IS NULL)
            ORDER BY COALESCE(mus.xp_this_month, 0) DESC
        )
    );

EXCEPTION
    WHEN OTHERS THEN
        v_error_message := SQLERRM;
        RETURN jsonb_build_object(
            'error', v_error_message,
            'status', 'error'
        );
END;
$$;
