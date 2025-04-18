-- Lösche alle existierenden Varianten der Funktion
DROP FUNCTION IF EXISTS public.get_answer_stats(UUID);
DROP FUNCTION IF EXISTS get_answer_stats(UUID);

CREATE OR REPLACE FUNCTION public.get_answer_stats(
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

    -- Hole Antwort-Statistiken des Benutzers
    WITH answer_stats AS (
        SELECT 
            COUNT(*) as total_answers,
            COUNT(*) FILTER (WHERE is_correct) as correct_answers,
            COUNT(DISTINCT question_id) as unique_questions_answered,
            COUNT(DISTINCT subject_id) as unique_subjects_answered,
            COUNT(DISTINCT DATE(answered_at)) as days_active,
            MIN(answered_at) as first_answer_date,
            MAX(answered_at) as last_answer_date,
            AVG(CASE WHEN is_correct THEN 1 ELSE 0 END) * 100 as success_rate
        FROM answers a
        JOIN questions q ON q.id = a.question_id
        WHERE a.user_id = p_user_id
    ),
    recent_activity AS (
        SELECT 
            DATE(answered_at) as date,
            COUNT(*) as answers,
            COUNT(*) FILTER (WHERE is_correct) as correct_answers,
            SUM(qt.base_xp) FILTER (WHERE is_correct) as xp_earned
        FROM answers a
        JOIN questions q ON q.id = a.question_id
        JOIN question_types qt ON q.question_type_id = qt.id
        WHERE a.user_id = p_user_id
        AND answered_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(answered_at)
        ORDER BY date DESC
    )
    SELECT jsonb_build_object(
        'success', true,
        'data', jsonb_build_object(
            'overall_stats', (
                SELECT jsonb_build_object(
                    'total_answers', total_answers,
                    'correct_answers', correct_answers,
                    'unique_questions_answered', unique_questions_answered,
                    'unique_subjects_answered', unique_subjects_answered,
                    'days_active', days_active,
                    'first_answer_date', first_answer_date,
                    'last_answer_date', last_answer_date,
                    'success_rate', ROUND(success_rate, 2)
                )
                FROM answer_stats
            ),
            'recent_activity', COALESCE(
                (
                    SELECT jsonb_agg(
                        jsonb_build_object(
                            'date', date,
                            'answers', answers,
                            'correct_answers', correct_answers,
                            'xp_earned', xp_earned,
                            'success_rate', ROUND((correct_answers::float / answers) * 100, 2)
                        )
                    )
                    FROM recent_activity
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