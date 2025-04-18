-- Lösche alle existierenden Varianten der Funktion
DROP FUNCTION IF EXISTS public.get_user_progress(UUID);
DROP FUNCTION IF EXISTS get_user_progress(UUID);

CREATE OR REPLACE FUNCTION public.get_user_progress(
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

    -- Hole Fortschritts-Statistiken
    WITH subject_progress AS (
        SELECT 
            s.id,
            s.name,
            COUNT(DISTINCT q.id) as total_questions,
            COUNT(DISTINCT a.id) as answered_questions,
            COUNT(DISTINCT a.id) FILTER (WHERE a.is_correct) as correct_answers,
            SUM(qt.base_xp) FILTER (WHERE a.is_correct) as xp_earned
        FROM subjects s
        LEFT JOIN questions q ON q.subject_id = s.id
        LEFT JOIN question_types qt ON q.question_type_id = qt.id
        LEFT JOIN answers a ON a.question_id = q.id AND a.user_id = p_user_id
        GROUP BY s.id, s.name
    ),
    daily_progress AS (
        SELECT 
            DATE(a.answered_at) as date,
            COUNT(*) as answers,
            COUNT(*) FILTER (WHERE a.is_correct) as correct_answers,
            SUM(qt.base_xp) FILTER (WHERE a.is_correct) as xp_earned
        FROM answers a
        JOIN questions q ON q.id = a.question_id
        JOIN question_types qt ON q.question_type_id = qt.id
        WHERE a.user_id = p_user_id
        AND a.answered_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(a.answered_at)
        ORDER BY date DESC
    ),
    level_progress AS (
        SELECT 
            l.level,
            l.xp_required,
            us.total_xp,
            CASE 
                WHEN us.total_xp >= l.xp_required THEN 100
                ELSE ROUND((us.total_xp::float / l.xp_required) * 100, 2)
            END as progress_percentage
        FROM levels l
        CROSS JOIN user_stats us
        WHERE us.user_id = p_user_id
        AND l.level = us.current_level
        LIMIT 1
    )
    SELECT jsonb_build_object(
        'success', true,
        'data', jsonb_build_object(
            'subjects', COALESCE(
                (
                    SELECT jsonb_agg(
                        jsonb_build_object(
                            'id', id,
                            'name', name,
                            'total_questions', total_questions,
                            'answered_questions', answered_questions,
                            'correct_answers', correct_answers,
                            'xp_earned', xp_earned,
                            'completion_rate', CASE 
                                WHEN total_questions > 0 
                                THEN ROUND((answered_questions::float / total_questions) * 100, 2)
                                ELSE 0
                            END,
                            'success_rate', CASE 
                                WHEN answered_questions > 0 
                                THEN ROUND((correct_answers::float / answered_questions) * 100, 2)
                                ELSE 0
                            END
                        )
                        ORDER BY xp_earned DESC
                    )
                    FROM subject_progress
                ),
                '[]'::jsonb
            ),
            'daily_progress', COALESCE(
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
                    FROM daily_progress
                ),
                '[]'::jsonb
            ),
            'level_progress', (
                SELECT jsonb_build_object(
                    'current_level', level,
                    'xp_required', xp_required,
                    'current_xp', total_xp,
                    'progress_percentage', progress_percentage
                )
                FROM level_progress
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