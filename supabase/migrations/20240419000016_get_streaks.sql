-- Lösche alle existierenden Varianten der Funktion
DROP FUNCTION IF EXISTS public.get_streaks(UUID);
DROP FUNCTION IF EXISTS get_streaks(UUID);

CREATE OR REPLACE FUNCTION public.get_streaks(
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

    -- Hole alle Streaks des Benutzers
    SELECT jsonb_build_object(
        'success', true,
        'data', jsonb_build_object(
            'quiz_streak', (
                SELECT jsonb_build_object(
                    'current_streak', current_streak,
                    'longest_streak', longest_streak,
                    'last_activity', last_activity,
                    'streak_bonus', streak_bonus
                )
                FROM user_streaks
                WHERE user_id = p_user_id
            ),
            'daily_streak', (
                SELECT jsonb_build_object(
                    'current_streak', current_streak,
                    'longest_streak', longest_streak,
                    'last_activity', last_activity,
                    'streak_bonus', streak_bonus
                )
                FROM daily_streaks
                WHERE user_id = p_user_id
            ),
            'streak_history', (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'date', date,
                        'quiz_streak', quiz_streak,
                        'daily_streak', daily_streak,
                        'total_xp_earned', total_xp_earned
                    )
                    ORDER BY date DESC
                )
                FROM streak_history
                WHERE user_id = p_user_id
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