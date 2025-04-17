-- File: get_player_leaderboard.sql
DROP FUNCTION IF EXISTS public.get_player_leaderboard();
DROP FUNCTION IF EXISTS get_player_leaderboard();

CREATE OR REPLACE FUNCTION public.get_player_leaderboard()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_error_message TEXT;
    v_total_players INTEGER;
    v_active_players INTEGER;
    v_current_month DATE;
BEGIN
    -- Setze aktuellen Monat
    v_current_month := date_trunc('month', NOW())::DATE;

    -- Hole Spieler-Statistiken
    SELECT 
        COUNT(DISTINCT p.id),
        COUNT(DISTINCT CASE WHEN us.total_xp > 0 THEN p.id END)
    INTO 
        v_total_players,
        v_active_players
    FROM profiles p
    LEFT JOIN user_stats us ON us.user_id = p.id;

    -- Rückgabe der Rangliste
    RETURN jsonb_build_object(
        'status', 'success',
        'overview', jsonb_build_object(
            'total_players', v_total_players,
            'active_players', v_active_players,
            'current_month', v_current_month
        ),
        'all_time_ranking', (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'rank', ROW_NUMBER() OVER (ORDER BY COALESCE(us.total_xp, 0) DESC),
                    'username', p.username,
                    'university', p.university,
                    'total_xp', COALESCE(us.total_xp, 0),
                    'level', us.level,
                    'stats', jsonb_build_object(
                        'correct_answers', COALESCE(us.correct_answers, 0),
                        'total_answers', COALESCE(us.total_answers, 0),
                        'accuracy_percentage',
                            CASE 
                                WHEN COALESCE(us.total_answers, 0) > 0 
                                THEN ROUND((us.correct_answers::FLOAT / us.total_answers) * 100)
                                ELSE 0
                            END
                    ),
                    'medals', (
                        SELECT jsonb_build_object(
                            'gold', COUNT(*) FILTER (WHERE medal = 'gold'),
                            'silver', COUNT(*) FILTER (WHERE medal = 'silver'),
                            'bronze', COUNT(*) FILTER (WHERE medal = 'bronze')
                        )
                        FROM user_medals um
                        WHERE um.user_id = p.id
                    ),
                    'streaks', jsonb_build_object(
                        'current_streak', COALESCE(us2.current_streak, 0),
                        'max_streak', COALESCE(us2.max_streak, 0)
                    )
                )
            )
            FROM profiles p
            LEFT JOIN user_stats us ON us.user_id = p.id
            LEFT JOIN user_streaks us2 ON us2.user_id = p.id
            WHERE us.total_xp > 0
            ORDER BY COALESCE(us.total_xp, 0) DESC
            LIMIT 100
        ),
        'monthly_ranking', (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'rank', ROW_NUMBER() OVER (ORDER BY COUNT(*) FILTER (WHERE aq.is_correct = true) DESC),
                    'username', p.username,
                    'university', p.university,
                    'monthly_stats', jsonb_build_object(
                        'correct_answers', COUNT(*) FILTER (WHERE aq.is_correct = true),
                        'total_answers', COUNT(*),
                        'accuracy_percentage',
                            CASE 
                                WHEN COUNT(*) > 0 
                                THEN ROUND((COUNT(*) FILTER (WHERE aq.is_correct = true)::FLOAT / COUNT(*)) * 100)
                                ELSE 0
                            END,
                        'active_days', COUNT(DISTINCT DATE(aq.answered_at))
                    )
                )
            )
            FROM profiles p
            LEFT JOIN answered_questions aq ON aq.user_id = p.id
                AND DATE(aq.answered_at) >= v_current_month
            WHERE EXISTS (
                SELECT 1 FROM answered_questions aq2
                WHERE aq2.user_id = p.id
                AND DATE(aq2.answered_at) >= v_current_month
            )
            GROUP BY p.id, p.username, p.university
            ORDER BY COUNT(*) FILTER (WHERE aq.is_correct = true) DESC
            LIMIT 100
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
