-- File: get_question_detail.sql
CREATE OR REPLACE FUNCTION "public"."get_question_detail"("p_question_id" bigint) RETURNS "jsonb"
    LANGUAGE "sql" STABLE
    AS $$
SELECT jsonb_build_object(
  'id',             q.id,
  'type',           qt.id,
  'question',       q.question,

  -- Multiple‑Choice A–D
  'options', CASE WHEN qt.id = 'multiple_choice' THEN
    jsonb_build_array(
      jsonb_build_object('key','A','text',q.option_a),
      jsonb_build_object('key','B','text',q.option_b),
      jsonb_build_object('key','C','text',q.option_c),
      jsonb_build_object('key','D','text',q.option_d)
    )
  ELSE '[]'::jsonb END,

  -- True/False
  'is_true', CASE WHEN qt.id = 'true_false' THEN
    (q.correct_answer = 'true')::boolean
  ELSE NULL END,

  -- Open Question
  'open_question', CASE WHEN qt.id = 'open_question' THEN
    jsonb_build_object('selfGraded',true)
  ELSE NULL END,

  -- Fill‑Blank
  'fill_blank', CASE WHEN qt.id = 'fill_blank' THEN
    jsonb_build_object('correctAnswer', q.correct_answer)
  ELSE NULL END,

  -- Case‑Subquestions
  'sub_questions', CASE WHEN qt.id = 'case_subquestions' THEN
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id',    cs.id,
        'text',  cs.statement_text,
        'answer',cs.correct_answer
      ))
      FROM public.cases_subquestions cs
      WHERE cs.question_id = q.id
    ), '[]'::jsonb)
  ELSE '[]'::jsonb END,

  -- **Korrigiertes Sequence‑Steps‑Segment**  
  'sequence_steps', CASE WHEN qt.id = 'sequence' THEN
    COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id',       ss.id,
          'title',    ss.title,
          'position', ss.position,
          'level',    ss.level
        )
        ORDER BY ss.position
      )
      FROM public.sequence_steps ss
      JOIN public.sequence_blocks sb ON ss.block_id = sb.id
      WHERE sb.question_id = q.id
    ), '[]'::jsonb)
  ELSE '[]'::jsonb END,

  -- Drag & Drop
  'dragdrop', CASE WHEN qt.id = 'dragdrop' THEN
    COALESCE((
      SELECT jsonb_build_object(
        'groupName', dg.group_name,
        'pairs',     (
          SELECT jsonb_agg(jsonb_build_object(
            'id',           dp.id,
            'dragText',     dp.drag_text,
            'correctMatch', dp.correct_match
          ))
          FROM public.dragdrop_pairs dp
          WHERE dp.group_id = dg.id
        )
      )
      FROM public.dragdrop_groups dg
      WHERE dg.question_id = q.id
    ), '{}'::jsonb)
  ELSE '{}'::jsonb END,

  -- Dispute‑Modul
  'dispute', CASE WHEN qt.id = 'dispute' THEN
    jsonb_build_object(
      'views',       COALESCE((
        SELECT jsonb_agg(
          jsonb_build_object(
            'id',          dv.id,
            'viewName',    dv.view_name,
            'description', dv.description
          )
        )
        FROM public.dispute_views dv
        WHERE dv.dispute_case_id = q.id::text::uuid
      ), '[]'::jsonb),
      'answers',     COALESCE((
        SELECT jsonb_agg(
          jsonb_build_object(
            'id',         da.id,
            'answerText', da.answer_text
          )
        )
        FROM public.dispute_answers da
        WHERE da.dispute_question_id = q.id::text::uuid
      ), '[]'::jsonb),
      'arguments',   COALESCE((
        SELECT jsonb_agg(
          jsonb_build_object(
            'id',           dar.id,
            'argumentText', dar.argument_text
          )
        )
        FROM public.dispute_arguments dar
        JOIN public.dispute_views dv2 ON dar.dispute_view_id = dv2.id
        WHERE dv2.dispute_case_id = q.id::text::uuid
      ), '[]'::jsonb),
      'preferences', COALESCE((
        SELECT jsonb_agg(
          jsonb_build_object(
            'id',              dp.id,
            'preferenceOrder', dp.preference_order
          )
        )
        FROM public.dispute_preferences dp
        WHERE dp.dispute_case_id = q.id::text::uuid
      ), '[]'::jsonb)
    )
  ELSE '{}'::jsonb END,

  -- Gemeinsame Felder
  'correct_answer', q.correct_answer,
  'explanation',    q.explanation

) AS detail
FROM public.questions q
JOIN public.question_types qt ON q.question_type_id = qt.id_uuid
WHERE q.id = p_question_id;
$$;
