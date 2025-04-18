-- Lösche alle existierenden Varianten der Funktion
DROP FUNCTION IF EXISTS public.get_quiz_summary(UUID);
DROP FUNCTION IF EXISTS get_quiz_summary(UUID);

CREATE OR REPLACE FUNCTION public.get_quiz_summary(
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

    -- Hole Quiz-Zusammenfassung
    WITH quiz_sessions AS (
        SELECT 
            DATE(started_at) as date,
            COUNT(*) as total_sessions,
            COUNT(*) FILTER (WHERE completed_at IS NOT NULL) as completed_sessions,
            COUNT(*) FILTER (WHERE completed_at IS NULL) as abandoned_sessions,
            AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_duration_seconds,
            SUM(questions_answered) as total_questions,
            SUM(correct_answers) as total_correct,
            SUM(xp_earned) as total_xp
        FROM quiz_sessions
        WHERE user_id = p_user_id
        GROUP BY DATE(started_at)
        ORDER BY date DESC
        LIMIT 30
    ),
    subject_performance AS (
        SELECT 
            s.name as subject_name,
            COUNT(DISTINCT qs.id) as sessions_played,
            SUM(qs.questions_answered) as questions_answered,
            SUM(qs.correct_answers) as correct_answers,
            SUM(qs.xp_earned) as xp_earned
        FROM quiz_sessions qs
        JOIN questions q ON q.id = qs.question_id
        JOIN subjects s ON s.id = q.subject_id
        WHERE qs.user_id = p_user_id
        GROUP BY s.name
        ORDER BY xp_earned DESC
    )
    SELECT jsonb_build_object(
        'success', true,
        'data', jsonb_build_object(
            'recent_sessions', COALESCE(
                (
                    SELECT jsonb_agg(
                        jsonb_build_object(
                            'date', date,
                            'total_sessions', total_sessions,
                            'completed_sessions', completed_sessions,
                            'abandoned_sessions', abandoned_sessions,
                            'avg_duration_seconds', ROUND(avg_duration_seconds, 2),
                            'total_questions', total_questions,
                            'total_correct', total_correct,
                            'total_xp', total_xp,
                            'success_rate', CASE 
                                WHEN total_questions > 0 
                                THEN ROUND((total_correct::float / total_questions) * 100, 2)
                                ELSE 0
                            END
                        )
                    )
                    FROM quiz_sessions
                ),
                '[]'::jsonb
            ),
            'subject_performance', COALESCE(
                (
                    SELECT jsonb_agg(
                        jsonb_build_object(
                            'subject_name', subject_name,
                            'sessions_played', sessions_played,
                            'questions_answered', questions_answered,
                            'correct_answers', correct_answers,
                            'xp_earned', xp_earned,
                            'success_rate', CASE 
                                WHEN questions_answered > 0 
                                THEN ROUND((correct_answers::float / questions_answered) * 100, 2)
                                ELSE 0
                            END
                        )
                    )
                    FROM subject_performance
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