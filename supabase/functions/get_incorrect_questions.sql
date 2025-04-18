-- File: get_incorrect_questions.sql
CREATE OR REPLACE FUNCTION "public"."get_incorrect_questions"("p_user_id" "uuid") RETURNS TABLE("question_id" bigint, "question" "text", "answered_at" timestamp without time zone, "explanation" "text", "question_type" "text")
    LANGUAGE "sql" STABLE
    AS $$
select
  aq.question_id,
  q.question,
  aq.answered_at,
  q.explanation,
  qt.id as question_type
from public.answered_questions aq
join public.questions q
  on q.id = aq.question_id
join public.question_types qt
  on q.question_type_id = qt.id_uuid
where aq.user_id = p_user_id
  and aq.is_correct = false
order by aq.answered_at;
$$;
