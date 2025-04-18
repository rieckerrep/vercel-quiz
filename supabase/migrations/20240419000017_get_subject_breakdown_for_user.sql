-- Lösche alle existierenden Varianten der Funktion
DROP FUNCTION IF EXISTS public.get_subject_breakdown_for_user(UUID);
DROP FUNCTION IF EXISTS get_subject_breakdown_for_user(UUID);

CREATE OR REPLACE FUNCTION public.get_subject_breakdown_for_user(
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

    -- Hole Fächer-Statistiken des Benutzers
    WITH subject_stats AS (
        SELECT 
            s.id,
            s.name,
            COUNT(DISTINCT q.id) as total_questions,
            COUNT(DISTINCT a.id) as total_answers,
            COUNT(DISTINCT a.id) FILTER (WHERE a.is_correct) as correct_answers,
            SUM(qt.base_xp) FILTER (WHERE a.is_correct) as total_xp_earned
        FROM subjects s
        LEFT JOIN questions q ON q.subject_id = s.id
        LEFT JOIN question_types qt ON q.question_type_id = qt.id
        LEFT JOIN answers a ON a.question_id = q.id AND a.user_id = p_user_id
        GROUP BY s.id, s.name
    )
    SELECT jsonb_build_object(
        'success', true,
        'data', jsonb_build_object(
            'total_subjects', COUNT(*),
            'subjects', COALESCE(
                (
                    SELECT jsonb_agg(
                        jsonb_build_object(
                            'id', id,
                            'name', name,
                            'total_questions', total_questions,
                            'total_answers', total_answers,
                            'correct_answers', correct_answers,
                            'total_xp_earned', total_xp_earned,
                            'success_rate', CASE 
                                WHEN total_answers > 0 
                                THEN ROUND((correct_answers::float / total_answers) * 100, 2)
                                ELSE 0
                            END,
                            'completion_rate', CASE 
                                WHEN total_questions > 0 
                                THEN ROUND((total_answers::float / total_questions) * 100, 2)
                                ELSE 0
                            END
                        )
                        ORDER BY total_xp_earned DESC
                    )
                    FROM subject_stats
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