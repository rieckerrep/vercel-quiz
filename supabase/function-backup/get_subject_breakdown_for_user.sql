-- File: get_subject_breakdown_for_user.sql
DROP FUNCTION IF EXISTS public.get_subject_breakdown_for_user(UUID);
DROP FUNCTION IF EXISTS get_subject_breakdown_for_user(UUID);

CREATE OR REPLACE FUNCTION public.get_subject_breakdown_for_user(
    p_user_id UUID
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_error_message TEXT;
    v_total_subjects INTEGER;
    v_subjects_started INTEGER;
    v_subjects_completed INTEGER;
BEGIN
    -- Hole Gesamtübersicht der Fächer
    SELECT 
        COUNT(DISTINCT s.id),
        COUNT(DISTINCT CASE WHEN aq.id IS NOT NULL THEN s.id END),
        COUNT(DISTINCT CASE 
            WHEN (
                SELECT COUNT(DISTINCT q2.id) 
                FROM questions q2 
                WHERE q2.chapter_id IN (
                    SELECT ch2.id 
                    FROM chapters ch2 
                    WHERE ch2.course_id IN (
                        SELECT c2.id 
                        FROM courses c2 
                        WHERE c2.subject_id = s.id
                    )
                )
            ) = (
                SELECT COUNT(DISTINCT aq2.question_id)
                FROM answered_questions aq2
                WHERE aq2.user_id = p_user_id
                AND aq2.is_correct = true
                AND aq2.question_id IN (
                    SELECT q3.id 
                    FROM questions q3 
                    WHERE q3.chapter_id IN (
                        SELECT ch3.id 
                        FROM chapters ch3 
                        WHERE ch3.course_id IN (
                            SELECT c3.id 
                            FROM courses c3 
                            WHERE c3.subject_id = s.id
                        )
                    )
                )
            ) THEN s.id 
        END)
    INTO 
        v_total_subjects,
        v_subjects_started,
        v_subjects_completed
    FROM subjects s
    LEFT JOIN courses c ON c.subject_id = s.id
    LEFT JOIN chapters ch ON ch.course_id = c.id
    LEFT JOIN questions q ON q.chapter_id = ch.id
    LEFT JOIN answered_questions aq ON aq.question_id = q.id 
        AND aq.user_id = p_user_id;

    -- Rückgabe der Statistiken
    RETURN jsonb_build_object(
        'status', 'success',
        'overview', jsonb_build_object(
            'total_subjects', v_total_subjects,
            'subjects_started', v_subjects_started,
            'subjects_completed', v_subjects_completed,
            'completion_percentage', 
                CASE 
                    WHEN v_total_subjects > 0 
                    THEN ROUND((v_subjects_completed::FLOAT / v_total_subjects) * 100)
                    ELSE 0
                END
        ),
        'subjects', (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'subject_name', s.name,
                    'total_questions', COUNT(DISTINCT q.id),
                    'answered_questions', COUNT(DISTINCT aq.question_id),
                    'correct_answers', COUNT(DISTINCT CASE WHEN aq.is_correct THEN aq.question_id END),
                    'accuracy_percentage',
                        CASE 
                            WHEN COUNT(DISTINCT aq.question_id) > 0 
                            THEN ROUND((COUNT(DISTINCT CASE WHEN aq.is_correct THEN aq.question_id END)::FLOAT / 
                                COUNT(DISTINCT aq.question_id)) * 100)
                            ELSE 0
                        END,
                    'completion_percentage',
                        CASE 
                            WHEN COUNT(DISTINCT q.id) > 0 
                            THEN ROUND((COUNT(DISTINCT CASE WHEN aq.is_correct THEN aq.question_id END)::FLOAT / 
                                COUNT(DISTINCT q.id)) * 100)
                            ELSE 0
                        END,
                    'last_activity', MAX(aq.answered_at),
                    'courses', (
                        SELECT jsonb_agg(
                            jsonb_build_object(
                                'course_name', c2.name,
                                'total_questions', COUNT(DISTINCT q2.id),
                                'answered_questions', COUNT(DISTINCT aq2.question_id),
                                'correct_answers', COUNT(DISTINCT CASE WHEN aq2.is_correct THEN aq2.question_id END),
                                'completion_percentage',
                                    CASE 
                                        WHEN COUNT(DISTINCT q2.id) > 0 
                                        THEN ROUND((COUNT(DISTINCT CASE WHEN aq2.is_correct THEN aq2.question_id END)::FLOAT / 
                                            COUNT(DISTINCT q2.id)) * 100)
                                        ELSE 0
                                    END
                            )
                        )
                        FROM courses c2
                        LEFT JOIN chapters ch2 ON ch2.course_id = c2.id
                        LEFT JOIN questions q2 ON q2.chapter_id = ch2.id
                        LEFT JOIN answered_questions aq2 ON aq2.question_id = q2.id 
                            AND aq2.user_id = p_user_id
                        WHERE c2.subject_id = s.id
                        GROUP BY c2.id, c2.name
                        ORDER BY c2.name
                    )
                )
                ORDER BY s.name
            )
            FROM subjects s
            LEFT JOIN courses c ON c.subject_id = s.id
            LEFT JOIN chapters ch ON ch.course_id = c.id
            LEFT JOIN questions q ON q.chapter_id = ch.id
            LEFT JOIN answered_questions aq ON aq.question_id = q.id 
                AND aq.user_id = p_user_id
            GROUP BY s.id, s.name
        )
    );

EXCEPTION
    WHEN OTHERS THEN
        v_error_message := SQLERRM;
        RETURN jsonb_build_object(
            'error', v_error_message,
            'status', 'error'
        );
END;
$$;
