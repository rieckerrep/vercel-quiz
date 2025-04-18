-- Lösche alle existierenden Varianten der Funktion
DROP FUNCTION IF EXISTS public.get_player_leaderboard(INTEGER, INTEGER);
DROP FUNCTION IF EXISTS get_player_leaderboard(INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION public.get_player_leaderboard(
    p_limit INTEGER DEFAULT 100,
    p_offset INTEGER DEFAULT 0
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_players INTEGER;
    v_result jsonb;
BEGIN
    -- Ermittle Gesamtanzahl der Spieler
    SELECT COUNT(*) INTO v_total_players
    FROM user_stats us
    JOIN profiles p ON p.id = us.user_id
    WHERE us.last_active >= NOW() - INTERVAL '14 days';

    -- Erstelle Rangliste
    WITH ranked_players AS (
        SELECT 
            us.user_id,
            p.username,
            us.total_xp,
            us.current_league,
            us.league_xp,
            ROW_NUMBER() OVER (ORDER BY us.total_xp DESC) as global_rank,
            ROW_NUMBER() OVER (PARTITION BY us.current_league ORDER BY us.league_xp DESC) as league_rank
        FROM user_stats us
        JOIN profiles p ON p.id = us.user_id
        WHERE us.last_active >= NOW() - INTERVAL '14 days'
    )
    SELECT jsonb_build_object(
        'success', true,
        'data', jsonb_build_object(
            'total_players', v_total_players,
            'players', COALESCE(
                (
                    SELECT jsonb_agg(
                        jsonb_build_object(
                            'user_id', user_id,
                            'username', username,
                            'total_xp', total_xp,
                            'current_league', current_league,
                            'league_xp', league_xp,
                            'global_rank', global_rank,
                            'league_rank', league_rank
                        )
                        ORDER BY global_rank
                    )
                    FROM ranked_players
                    LIMIT p_limit
                    OFFSET p_offset
                ),
                '[]'::jsonb
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