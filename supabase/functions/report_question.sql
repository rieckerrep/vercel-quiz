-- File: report_question.sql
CREATE OR REPLACE FUNCTION "public"."report_question"("p_user_id" "uuid", "p_question_id" bigint, "p_reason" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Prüfen ob Frage existiert
  IF NOT EXISTS (
    SELECT 1 FROM public.questions 
    WHERE id = p_question_id
  ) THEN
    RETURN jsonb_build_object('error', 'Frage nicht gefunden');
  END IF;

  -- Report erstellen
  INSERT INTO public.question_reports(
    user_id,
    question_id,
    reason,
    status,
    created_at
  ) VALUES (
    p_user_id,
    p_question_id,
    p_reason,
    'pending',
    now()
  )
  ON CONFLICT (user_id, question_id) 
  DO UPDATE SET
    reason = EXCLUDED.reason,
    status = 'pending',
    created_at = now(),
    resolved_at = NULL,
    resolver_notes = NULL;

  RETURN jsonb_build_object(
    'status', 'reported',
    'question_id', p_question_id
  );
EXCEPTION 
  WHEN OTHERS THEN
    RETURN jsonb_build_object('error', SQLERRM);
END;
$$;
