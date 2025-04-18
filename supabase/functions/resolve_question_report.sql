-- File: resolve_question_report.sql
CREATE OR REPLACE FUNCTION "public"."resolve_question_report"("p_report_id" bigint, "p_status" "text", "p_notes" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE public.question_reports
  SET status = p_status,
      resolved_at = now(),
      resolver_notes = p_notes
  WHERE id = p_report_id;
  
  RETURN jsonb_build_object('status', 'resolved');
END;
$$;
