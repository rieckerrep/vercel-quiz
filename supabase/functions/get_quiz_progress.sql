-- File: get_quiz_progress.sql
CREATE OR REPLACE FUNCTION "public"."get_quiz_progress"("p_user_id" "uuid") RETURNS TABLE("chapter_id" bigint, "progress" integer)
    LANGUAGE "sql" STABLE
    AS $$
  SELECT chapter_id, progress
    FROM public.quiz_progress
   WHERE user_id = p_user_id;
$$;
