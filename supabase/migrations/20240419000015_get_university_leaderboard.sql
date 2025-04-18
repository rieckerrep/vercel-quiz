-- Lösche alle existierenden Varianten der Funktion
DROP FUNCTION IF EXISTS public.get_university_leaderboard();
DROP FUNCTION IF EXISTS get_university_leaderboard();

CREATE OR REPLACE FUNCTION public.get_university_leaderboard()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result jsonb;
BEGIN
    -- Erstelle Universitäts-Rangliste
    WITH university_stats AS (
        SELECT 
            u.id,
            u.name,
            COUNT(DISTINCT q.id) as total_questions,
            COUNT(DISTINCT a.user_id) as total_answers,
            COUNT(DISTINCT a.user_id) FILTER (WHERE a.is_correct) as correct_answers,
            COUNT(DISTINCT us.user_id) as active_students
        FROM universities u
        LEFT JOIN questions q ON q.university_id = u.id
        LEFT JOIN answers a ON a.question_id = q.id
        LEFT JOIN user_stats us ON us.university_id = u.id
        WHERE us.last_active >= NOW() - INTERVAL '14 days'
        GROUP BY u.id, u.name
    )
    SELECT jsonb_build_object(
        'success', true,
        'data', jsonb_build_object(
            'total_universities', COUNT(*),
            'universities', COALESCE(
                (
                    SELECT jsonb_agg(
                        jsonb_build_object(
                            'id', id,
                            'name', name,
                            'total_questions', total_questions,
                            'total_answers', total_answers,
                            'correct_answers', correct_answers,
                            'active_students', active_students,
                            'success_rate', CASE 
                                WHEN total_answers > 0 
                                THEN ROUND((correct_answers::float / total_answers) * 100, 2)
                                ELSE 0
                            END,
                            'rank', ROW_NUMBER() OVER (
                                ORDER BY 
                                    total_questions DESC,
                                    correct_answers DESC,
                                    active_students DESC
                            )
                        )
                        ORDER BY 
                            total_questions DESC,
                            correct_answers DESC,
                            active_students DESC
                    )
                    FROM university_stats
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