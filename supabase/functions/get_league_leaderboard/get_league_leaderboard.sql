-- File: get_league_leaderboard.sql
DROP FUNCTION IF EXISTS public.get_league_leaderboard(TEXT);
DROP FUNCTION IF EXISTS get_league_leaderboard(TEXT);

CREATE OR REPLACE FUNCTION public.get_league_leaderboard(
    p_league_name TEXT
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_error_message TEXT;
    v_total_players INTEGER;
    v_active_players INTEGER;
    v_league_id INTEGER;
    v_next_league TEXT;
    v_prev_league TEXT;
BEGIN
    -- Prüfe ob Liga existiert und hole Liga-Informationen
    SELECT 
        l.id,
        l.next_league,
        l.previous_league
    INTO 
        v_league_id,
        v_next_league,
        v_prev_league
    FROM leagues l
    WHERE l.name = p_league_name;

    IF v_league_id IS NULL THEN
        RETURN jsonb_build_object(
            'status', 'error',
            'message', 'Liga nicht gefunden'
        );
    END IF;

    -- Hole Liga-Statistiken
    SELECT 
        COUNT(DISTINCT p.id),
        COUNT(DISTINCT CASE WHEN us.total_xp > 0 THEN p.id END)
    INTO 
        v_total_players,
        v_active_players
    FROM profiles p
    LEFT JOIN user_stats us ON us.user_id = p.id
    WHERE us.current_league = p_league_name;

    -- Rückgabe der Liga-Rangliste
    RETURN jsonb_build_object(
        'status', 'success',
        'league_info', jsonb_build_object(
            'name', p_league_name,
            'total_players', v_total_players,
            'active_players', v_active_players,
            'next_league', v_next_league,
            'previous_league', v_prev_league
        ),
        'rankings', (
            WITH ranked_players AS (
                SELECT 
                    p.id,
                    p.username,
                    p.university,
                    COALESCE(us.total_xp, 0) as total_xp,
                    us.level,
                    COALESCE(us.correct_answers, 0) as correct_answers,
                    COALESCE(us.total_answers, 0) as total_answers,
                    lp.updated_at,
                    ROW_NUMBER() OVER (ORDER BY COALESCE(us.total_xp, 0) DESC) as rank,
                    -- Berechne XP der letzten 14 Tage
                    (
                        SELECT COALESCE(SUM(xp_amount), 0)
                        FROM xp_history xh
                        WHERE xh.user_id = p.id
                        AND xh.created_at >= NOW() - INTERVAL '14 days'
                    ) as xp_14days,
                    -- Berechne Rang basierend auf 14-Tage-XP
                    ROW_NUMBER() OVER (
                        ORDER BY (
                            SELECT COALESCE(SUM(xp_amount), 0)
                            FROM xp_history xh
                            WHERE xh.user_id = p.id
                            AND xh.created_at >= NOW() - INTERVAL '14 days'
                        ) DESC
                    ) as rank_14days
                FROM profiles p
                LEFT JOIN user_stats us ON us.user_id = p.id
                LEFT JOIN league_positions lp ON lp.user_id = p.id AND lp.league_name = p_league_name
                WHERE us.current_league = p_league_name
            )
            SELECT jsonb_agg(
                jsonb_build_object(
                    'rank', rp.rank,
                    'username', rp.username,
                    'university', rp.university,
                    'total_xp', rp.total_xp,
                    'level', rp.level,
                    'promotion_status', 
                        CASE 
                            WHEN rp.rank_14days <= 5 AND v_next_league IS NOT NULL 
                            THEN 'promotion'
                            WHEN rp.rank_14days > (SELECT COUNT(*) FROM ranked_players) - 5 AND v_prev_league IS NOT NULL 
                            THEN 'demotion'
                            ELSE 'stable'
                        END,
                    'stats', jsonb_build_object(
                        'correct_answers', rp.correct_answers,
                        'total_answers', rp.total_answers,
                        'accuracy_percentage',
                            CASE 
                                WHEN rp.total_answers > 0 
                                THEN ROUND((rp.correct_answers::FLOAT / rp.total_answers) * 100)
                                ELSE 0
                            END,
                        'xp_14days', rp.xp_14days,
                        'rank_14days', rp.rank_14days
                    ),
                    'league_stats', jsonb_build_object(
                        'time_in_league', 
                            EXTRACT(DAY FROM NOW() - rp.updated_at),
                        'previous_leagues', (
                            SELECT jsonb_agg(DISTINCT previous_league)
                            FROM league_positions lp2
                            WHERE lp2.user_id = rp.id
                            AND lp2.league_name != p_league_name
                        )
                    )
                )
            )
            FROM ranked_players rp
            ORDER BY rp.rank
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