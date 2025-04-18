-- File: get_answer_stats.sql
DROP FUNCTION IF EXISTS public.get_answer_stats(UUID);
DROP FUNCTION IF EXISTS get_answer_stats(UUID);

CREATE OR REPLACE FUNCTION public.get_answer_stats(
    p_user_id UUID
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_error_message TEXT;
    v_total_answers INTEGER;
    v_total_correct INTEGER;
    v_accuracy_percentage INTEGER;
BEGIN
    -- Hole Gesamtstatistiken
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE is_correct = true)
    INTO 
        v_total_answers,
        v_total_correct
    FROM answered_questions
    WHERE user_id = p_user_id;

    -- Berechne Gesamtgenauigkeit
    IF v_total_answers > 0 THEN
        v_accuracy_percentage := ROUND((v_total_correct::FLOAT / v_total_answers) * 100);
    ELSE
        v_accuracy_percentage := 0;
    END IF;

    -- Rückgabe der Statistiken
    RETURN jsonb_build_object(
        'status', 'success',
        'overall_stats', jsonb_build_object(
            'total_answers', v_total_answers,
            'correct_answers', v_total_correct,
            'accuracy_percentage', v_accuracy_percentage
        ),
        'subject_stats', (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'subject_name', s.name,
                    'total_answers', COUNT(aq.*),
                    'correct_answers', COUNT(*) FILTER (WHERE aq.is_correct = true),
                    'accuracy_percentage', 
                        CASE 
                            WHEN COUNT(aq.*) > 0 
                            THEN ROUND((COUNT(*) FILTER (WHERE aq.is_correct = true)::FLOAT / COUNT(aq.*)) * 100)
                            ELSE 0
                        END,
                    'last_answered', MAX(aq.answered_at)
                )
            )
            FROM subjects s
            LEFT JOIN courses c ON c.subject_id = s.id
            LEFT JOIN chapters ch ON ch.course_id = c.id
            LEFT JOIN questions q ON q.chapter_id = ch.id
            LEFT JOIN answered_questions aq ON aq.question_id = q.id 
                AND aq.user_id = p_user_id
            GROUP BY s.id, s.name
            ORDER BY s.name
        ),
        'course_stats', (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'course_name', c.name,
                    'subject_name', s.name,
                    'total_answers', COUNT(aq.*),
                    'correct_answers', COUNT(*) FILTER (WHERE aq.is_correct = true),
                    'accuracy_percentage',
                        CASE 
                            WHEN COUNT(aq.*) > 0 
                            THEN ROUND((COUNT(*) FILTER (WHERE aq.is_correct = true)::FLOAT / COUNT(aq.*)) * 100)
                            ELSE 0
                        END,
                    'last_answered', MAX(aq.answered_at)
                )
            )
            FROM courses c
            JOIN subjects s ON s.id = c.subject_id
            LEFT JOIN chapters ch ON ch.course_id = c.id
            LEFT JOIN questions q ON q.chapter_id = ch.id
            LEFT JOIN answered_questions aq ON aq.question_id = q.id 
                AND aq.user_id = p_user_id
            GROUP BY c.id, c.name, s.name
            ORDER BY s.name, c.name
        ),
        'recent_activity', (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'question_id', aq.question_id,
                    'is_correct', aq.is_correct,
                    'answered_at', aq.answered_at,
                    'xp_awarded', aq.xp_awarded,
                    'chapter_name', ch.name,
                    'course_name', c.name
                )
                ORDER BY aq.answered_at DESC
            )
            FROM answered_questions aq
            JOIN questions q ON q.id = aq.question_id
            JOIN chapters ch ON ch.id = q.chapter_id
            JOIN courses c ON c.id = ch.course_id
            WHERE aq.user_id = p_user_id
            LIMIT 10
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
