-- Lösche alle existierenden Varianten der Funktion
DROP FUNCTION IF EXISTS public.get_university_contributors(INTEGER);
DROP FUNCTION IF EXISTS get_university_contributors(INTEGER);

CREATE OR REPLACE FUNCTION public.get_university_contributors(
    p_university_id INTEGER
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_university_exists BOOLEAN;
    v_result jsonb;
BEGIN
    -- Prüfe ob Universität existiert
    SELECT EXISTS (
        SELECT 1 FROM universities WHERE id = p_university_id
    ) INTO v_university_exists;

    IF NOT v_university_exists THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Universität nicht gefunden',
            'error', format('Universität mit ID %s existiert nicht', p_university_id)
        );
    END IF;

    -- Hole alle Beiträge der Universität
    WITH university_contributions AS (
        SELECT 
            q.id as question_id,
            q.text as question_text,
            qt.name as question_type,
            q.difficulty,
            qt.base_xp,
            COUNT(DISTINCT a.user_id) as total_answers,
            COUNT(DISTINCT a.user_id) FILTER (WHERE a.is_correct) as correct_answers
        FROM questions q
        JOIN question_types qt ON q.question_type_id = qt.id
        LEFT JOIN answers a ON a.question_id = q.id
        WHERE q.university_id = p_university_id
        GROUP BY q.id, q.text, qt.name, q.difficulty, qt.base_xp
    )
    SELECT jsonb_build_object(
        'success', true,
        'data', jsonb_build_object(
            'university_info', (
                SELECT jsonb_build_object(
                    'id', u.id,
                    'name', u.name,
                    'total_questions', COUNT(q.id),
                    'total_answers', SUM(uc.total_answers),
                    'correct_answers', SUM(uc.correct_answers)
                )
                FROM universities u
                LEFT JOIN questions q ON q.university_id = u.id
                LEFT JOIN university_contributions uc ON uc.question_id = q.id
                WHERE u.id = p_university_id
                GROUP BY u.id, u.name
            ),
            'contributions', COALESCE(
                (
                    SELECT jsonb_agg(
                        jsonb_build_object(
                            'question_id', question_id,
                            'question_text', question_text,
                            'question_type', question_type,
                            'difficulty', difficulty,
                            'base_xp', base_xp,
                            'total_answers', total_answers,
                            'correct_answers', correct_answers,
                            'success_rate', CASE 
                                WHEN total_answers > 0 
                                THEN ROUND((correct_answers::float / total_answers) * 100, 2)
                                ELSE 0
                            END
                        )
                        ORDER BY total_answers DESC
                    )
                    FROM university_contributions
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