-- Lösche alle existierenden Varianten der Funktion
DROP FUNCTION IF EXISTS public.get_user_stats(UUID);
DROP FUNCTION IF EXISTS get_user_stats(UUID);

CREATE OR REPLACE FUNCTION public.get_user_stats(
    p_user_id UUID
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_exists BOOLEAN;
    v_result jsonb;
BEGIN
    -- Prüfe ob Benutzer existiert
    SELECT EXISTS (
        SELECT 1 FROM profiles WHERE id = p_user_id
    ) INTO v_user_exists;

    IF NOT v_user_exists THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Benutzer nicht gefunden',
            'error', format('Benutzer mit ID %s existiert nicht', p_user_id)
        );
    END IF;

    -- Hole Benutzer-Statistiken
    WITH user_stats AS (
        SELECT 
            us.total_xp,
            us.current_level,
            us.current_league,
            us.league_xp,
            us.streak_count,
            us.last_active,
            us.university_id,
            u.name as university_name,
            COUNT(DISTINCT a.id) as total_answers,
            COUNT(DISTINCT a.id) FILTER (WHERE a.is_correct) as correct_answers,
            COUNT(DISTINCT qs.id) as total_sessions,
            COUNT(DISTINCT qs.id) FILTER (WHERE qs.completed_at IS NOT NULL) as completed_sessions
        FROM user_stats us
        LEFT JOIN universities u ON u.id = us.university_id
        LEFT JOIN answers a ON a.user_id = us.user_id
        LEFT JOIN quiz_sessions qs ON qs.user_id = us.user_id
        WHERE us.user_id = p_user_id
        GROUP BY us.user_id, us.total_xp, us.current_level, us.current_league, 
                 us.league_xp, us.streak_count, us.last_active, us.university_id, u.name
    ),
    level_info AS (
        SELECT 
            l.level,
            l.xp_required,
            l.xp_required - us.total_xp as xp_to_next_level
        FROM levels l
        CROSS JOIN user_stats us
        WHERE l.level = us.current_level + 1
        LIMIT 1
    ),
    league_info AS (
        SELECT 
            l.name,
            l.next_league,
            l.previous_league,
            l.promotion_threshold,
            l.demotion_threshold,
            us.league_xp,
            CASE 
                WHEN us.league_xp >= l.promotion_threshold THEN 'promotion'
                WHEN us.league_xp <= l.demotion_threshold THEN 'demotion'
                ELSE 'stable'
            END as status
        FROM leagues l
        JOIN user_stats us ON us.current_league = l.name
        WHERE us.user_id = p_user_id
    )
    SELECT jsonb_build_object(
        'success', true,
        'data', jsonb_build_object(
            'user_info', (
                SELECT jsonb_build_object(
                    'total_xp', total_xp,
                    'current_level', current_level,
                    'current_league', current_league,
                    'league_xp', league_xp,
                    'streak_count', streak_count,
                    'last_active', last_active,
                    'university', jsonb_build_object(
                        'id', university_id,
                        'name', university_name
                    ),
                    'total_answers', total_answers,
                    'correct_answers', correct_answers,
                    'total_sessions', total_sessions,
                    'completed_sessions', completed_sessions,
                    'success_rate', CASE 
                        WHEN total_answers > 0 
                        THEN ROUND((correct_answers::float / total_answers) * 100, 2)
                        ELSE 0
                    END,
                    'completion_rate', CASE 
                        WHEN total_sessions > 0 
                        THEN ROUND((completed_sessions::float / total_sessions) * 100, 2)
                        ELSE 0
                    END
                )
                FROM user_stats
            ),
            'level_info', (
                SELECT jsonb_build_object(
                    'next_level', level,
                    'xp_required', xp_required,
                    'xp_to_next_level', xp_to_next_level
                )
                FROM level_info
            ),
            'league_info', (
                SELECT jsonb_build_object(
                    'name', name,
                    'next_league', next_league,
                    'previous_league', previous_league,
                    'promotion_threshold', promotion_threshold,
                    'demotion_threshold', demotion_threshold,
                    'current_xp', league_xp,
                    'status', status
                )
                FROM league_info
            )
        )
    ) INTO v_result;

    RETURN v_result;

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'message', 'Ein Fehler ist aufgetreten',
        'error', SQLERRM
    );
END;
$$; 