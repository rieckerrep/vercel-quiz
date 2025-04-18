-- File: get_end_screen_details.sql
CREATE OR REPLACE FUNCTION "public"."get_end_screen_details"("p_user_id" "uuid", "p_chapter_id" bigint) RETURNS TABLE("question_id" bigint, "question_type" "text", "question" "text", "is_correct" boolean, "answered_at" timestamp without time zone, "xp_earned" integer, "coins_earned" integer, "time_taken" interval, "explanation" "text")
    LANGUAGE "sql" STABLE
    AS $$
SELECT
  aq.question_id,
  qt.id           AS question_type,
  q.question      AS question,
  aq.is_correct,
  aq.answered_at,
  COALESCE(ar.xp_earned,0)   AS xp_earned,
  COALESCE(ar.coins_earned,0) AS coins_earned,
  COALESCE(
    LEAD(aq.answered_at) OVER (ORDER BY aq.answered_at) - aq.answered_at,
    INTERVAL '0'
  ) AS time_taken,
  q.explanation
FROM public.answered_questions aq
JOIN public.questions q
  ON q.id = aq.question_id
JOIN public.question_types qt
  ON q.question_type_id = qt.id_uuid
LEFT JOIN public.answered_rewards ar
  ON ar.user_id             = aq.user_id
 AND ar.question_context_id::text = aq.question_id::text
WHERE aq.user_id    = p_user_id
  AND aq.chapter_id = p_chapter_id
ORDER BY aq.answered_at;
$$;
