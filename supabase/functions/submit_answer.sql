-- File: submit_answer.sql
CREATE OR REPLACE FUNCTION "public"."submit_answer"("p_user_id" "uuid", "p_question_id" bigint, "p_answer_data" "jsonb", "p_used_items" "jsonb" DEFAULT NULL::"jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$DECLARE
  v_qt            text;
  v_correct       text;
  v_is_correct    boolean;
  v_ctx           uuid;
  v_chapter       bigint;
  v_progress      integer;
  v_medal         text;
  v_explanation   text;
  v_xp            integer;
  v_coins         integer;
  v_result        jsonb;
BEGIN
  -- a) Frage‑Details holen
  SELECT qt.id, q.correct_answer, q.explanation, q.chapter_id
    INTO v_qt, v_correct, v_explanation, v_chapter
  FROM public.questions q
  JOIN public.question_types qt ON q.question_type_id = qt.id_uuid
  WHERE q.id = p_question_id;

  -- b) Antwort validieren
  v_is_correct := CASE v_qt
    WHEN 'multiple_choice' THEN p_answer_data->>'selected_option' = v_correct
    WHEN 'true_false'     THEN (p_answer_data->>'is_true')::boolean = (v_correct = 'true')
    WHEN 'open_question'  THEN (p_answer_data->>'is_correct')::boolean
    WHEN 'fill_blank'     THEN lower(p_answer_data->>'answer') = lower(v_correct)
    ELSE false
  END;

  -- c) Context dynamisch ermitteln
  v_ctx := CASE v_qt
    WHEN 'dispute'  THEN (
      SELECT dispute_case_id
        FROM public.dispute_questions
       WHERE id = p_question_id::text::uuid
    )
    WHEN 'sequence' THEN (
      SELECT block_id
        FROM public.sequence_steps
       WHERE id = p_question_id::text::uuid
    )
    WHEN 'dragdrop' THEN (
      SELECT dg.id::uuid
        FROM public.dragdrop_groups dg
       WHERE dg.question_id = p_question_id
    )
    ELSE NULL
  END;

  -- d) Reward oder Penalty vergeben
  IF v_ctx IS NOT NULL THEN
    PERFORM public.check_and_reward_answer(
      p_user_id,
      v_ctx,
      v_qt,
      v_is_correct
    );
  END IF;

  -- e) answered_questions speichern
  INSERT INTO public.answered_questions(
    user_id, question_id, is_correct, answered_at, chapter_id
  ) VALUES (
    p_user_id, p_question_id, v_is_correct, now(), v_chapter
  );

  -- f) Fortschritt berechnen
  SELECT ROUND((COUNT(*) FILTER (WHERE is_correct)::float / COUNT(*)::float)*100)::int
    INTO v_progress
  FROM public.answered_questions
  WHERE user_id    = p_user_id
    AND chapter_id = v_chapter;

  INSERT INTO public.quiz_progress(user_id,chapter_id,progress)
    VALUES (p_user_id, v_chapter, v_progress)
  ON CONFLICT (user_id, chapter_id) DO UPDATE
    SET progress = EXCLUDED.progress;

  -- h) XP & Coins aus answered_rewards abfragen
  IF v_ctx IS NOT NULL THEN
    SELECT COALESCE(ar.xp_earned,0), COALESCE(ar.coins_earned,0)
      INTO v_xp, v_coins
    FROM public.answered_rewards ar
    JOIN public.reward_types rt
      ON ar.reward_type_id = rt.id
     AND rt.question_type = v_qt
     AND rt.reward_type   = v_qt || '_reward'
     AND ar.user_id       = p_user_id
     AND ar.question_context_id = v_ctx;
  ELSE
    v_xp    := 0;
    v_coins := 0;
  END IF;

  -- i) JSON‑Ergebnis bauen und zurückgeben
  v_result := jsonb_build_object(
    'is_correct',   v_is_correct,
    'xp_earned',    v_xp,
    'coins_earned', v_coins,
    'progress',     v_progress,
    'medal',        v_medal,
    'explanation',  v_explanation
  );
  RETURN v_result;
END;$$;


ALTER FUNCTION "public"."submit_answer"("p_user_id" "uuid", "p_question_id" bigint, "p_answer_data" "jsonb", "p_used_items" "jsonb") OWNER TO "postgres";


