-- File: get_league_leaderboard.sql
DROP FUNCTION IF EXISTS get_league_leaderboard(p_league_name TEXT);
DROP FUNCTION IF EXISTS get_league_leaderboard(league_name TEXT);
DROP FUNCTION IF EXISTS get_league_leaderboard(p_league TEXT);
DROP FUNCTION IF EXISTS get_league_leaderboard(league TEXT);

CREATE OR REPLACE FUNCTION get_league_leaderboard(p_league_name TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_league_exists BOOLEAN;
    v_next_league TEXT;
    v_prev_league TEXT;
    v_promotion_threshold INTEGER;
    v_demotion_threshold INTEGER;
    v_total_players INTEGER;
    v_active_players INTEGER;
    v_result jsonb;
BEGIN
    -- Prüfe ob Liga existiert
    SELECT EXISTS (
        SELECT 1 FROM leagues WHERE name = p_league_name
    ) INTO v_league_exists;

    IF NOT v_league_exists THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Liga nicht gefunden',
            'error', format('Liga %s existiert nicht', p_league_name)
        );
    END IF;

    -- Ermittle nächste und vorherige Liga
    SELECT 
        LEAD(name) OVER (ORDER BY rank),
        LAG(name) OVER (ORDER BY rank)
    INTO v_next_league, v_prev_league
    FROM leagues 
    WHERE name = p_league_name;

    -- Setze Schwellenwerte für Auf- und Abstieg
    SELECT 
        CASE 
            WHEN p_league_name = 'Bronze' THEN 3
            WHEN p_league_name = 'Silber' THEN 5 
            WHEN p_league_name = 'Gold' THEN 10
            WHEN p_league_name = 'Platin' THEN 15
            ELSE 20
        END INTO v_promotion_threshold;

    SELECT 
        CASE 
            WHEN p_league_name = 'Bronze' THEN 0
            WHEN p_league_name = 'Silber' THEN 2
            WHEN p_league_name = 'Gold' THEN 3
            WHEN p_league_name = 'Platin' THEN 5
            ELSE 10
        END INTO v_demotion_threshold;

    -- Ermittle Statistiken über Spieler in der Liga
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE last_active >= NOW() - INTERVAL '14 days')
    INTO v_total_players, v_active_players
    FROM user_stats 
    WHERE current_league = p_league_name;

    -- Erstelle Rangliste mit Auf-/Abstiegsstatus
    WITH ranked_players AS (
        SELECT 
            us.user_id,
            p.username,
            us.league_xp,
            us.current_league,
            ROW_NUMBER() OVER (ORDER BY us.league_xp DESC) as rank,
            CASE 
                WHEN ROW_NUMBER() OVER (ORDER BY us.league_xp DESC) <= v_promotion_threshold 
                AND v_next_league IS NOT NULL THEN true
                ELSE false
            END as will_promote,
            CASE 
                WHEN ROW_NUMBER() OVER (ORDER BY us.league_xp DESC) > 
                    (SELECT COUNT(*) FROM user_stats WHERE current_league = p_league_name) - v_demotion_threshold
                AND v_prev_league IS NOT NULL THEN true
                ELSE false
            END as will_demote
        FROM user_stats us
        JOIN profiles p ON p.id = us.user_id
        WHERE us.current_league = p_league_name
        AND us.last_active >= NOW() - INTERVAL '14 days'
    )
    SELECT jsonb_build_object(
        'success', true,
        'data', jsonb_build_object(
            'league_name', p_league_name,
            'next_league', v_next_league,
            'prev_league', v_prev_league,
            'total_players', v_total_players,
            'active_players', v_active_players,
            'promotion_threshold', v_promotion_threshold,
            'demotion_threshold', v_demotion_threshold,
            'players', COALESCE(
                (
                    SELECT jsonb_agg(
                        jsonb_build_object(
                            'user_id', user_id,
                            'username', username,
                            'league_xp', league_xp,
                            'rank', rank,
                            'will_promote', will_promote,
                            'will_demote', will_demote
                        )
                        ORDER BY rank
                    )
                    FROM ranked_players
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
