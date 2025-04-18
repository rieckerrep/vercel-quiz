-- File: get_university_leaderboard.sql
DROP FUNCTION IF EXISTS public.get_university_leaderboard();
DROP FUNCTION IF EXISTS get_university_leaderboard();

CREATE OR REPLACE FUNCTION public.get_university_leaderboard()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_error_message TEXT;
    v_total_universities INTEGER;
    v_active_universities INTEGER;
    v_current_month DATE;
BEGIN
    -- Setze aktuellen Monat
    v_current_month := date_trunc('month', NOW())::DATE;

    -- Hole Uni-Statistiken
    SELECT 
        COUNT(DISTINCT university),
        COUNT(DISTINCT CASE WHEN total_xp > 0 THEN university END)
    INTO 
        v_total_universities,
        v_active_universities
    FROM profiles p
    LEFT JOIN user_stats us ON us.user_id = p.id
    WHERE university IS NOT NULL;

    -- Rückgabe der Rangliste
    RETURN jsonb_build_object(
        'status', 'success',
        'overview', jsonb_build_object(
            'total_universities', v_total_universities,
            'active_universities', v_active_universities,
            'current_month', v_current_month
        ),
        'all_time_ranking', (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'rank', ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(us.total_xp), 0) DESC),
                    'university', p.university,
                    'total_xp', COALESCE(SUM(us.total_xp), 0),
                    'active_users', COUNT(DISTINCT p.id),
                    'average_xp_per_user', 
                        CASE 
                            WHEN COUNT(DISTINCT p.id) > 0 
                            THEN ROUND(COALESCE(SUM(us.total_xp), 0)::FLOAT / COUNT(DISTINCT p.id))
                            ELSE 0
                        END
                )
            )
            FROM profiles p
            LEFT JOIN user_stats us ON us.user_id = p.id
            WHERE p.university IS NOT NULL
            GROUP BY p.university
            ORDER BY COALESCE(SUM(us.total_xp), 0) DESC
        ),
        'monthly_ranking', (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'rank', ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(mus.xp_this_month), 0) DESC),
                    'university', u.name,
                    'monthly_xp', COALESCE(SUM(mus.xp_this_month), 0),
                    'active_users_this_month', COUNT(DISTINCT p.id),
                    'average_monthly_xp',
                        CASE 
                            WHEN COUNT(DISTINCT p.id) > 0 
                            THEN ROUND(COALESCE(SUM(mus.xp_this_month), 0)::FLOAT / COUNT(DISTINCT p.id))
                            ELSE 0
                        END,
                    'change_from_last_month', (
                        SELECT COALESCE(SUM(xp_this_month), 0) - 
                            COALESCE((
                                SELECT SUM(xp_this_month)
                                FROM monthly_uni_scores
                                WHERE university_id = u.id
                                AND month_start = v_current_month - INTERVAL '1 month'
                            ), 0)
                        FROM monthly_uni_scores
                        WHERE university_id = u.id
                        AND month_start = v_current_month
                    )
                )
            )
            FROM universities u
            LEFT JOIN monthly_uni_scores mus ON mus.university_id = u.id 
                AND mus.month_start = v_current_month
            LEFT JOIN profiles p ON p.university = u.name
            GROUP BY u.id, u.name
            ORDER BY COALESCE(SUM(mus.xp_this_month), 0) DESC
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
