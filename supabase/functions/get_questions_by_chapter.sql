-- File: get_questions_by_chapter.sql
CREATE OR REPLACE FUNCTION "public"."get_questions_by_chapter"("p_chapter_id" bigint) RETURNS "jsonb"
    LANGUAGE "sql" STABLE
    AS $$
SELECT jsonb_agg(qry) FROM (
  SELECT
    q.id,
    qt.id AS question_type,
    q.question,

    -- Multiple‑Choice A–D
    CASE WHEN qt.id = 'multiple_choice' THEN
      jsonb_build_array(
        jsonb_build_object('key','A','text',q.option_a),
        jsonb_build_object('key','B','text',q.option_b),
        jsonb_build_object('key','C','text',q.option_c),
        jsonb_build_object('key','D','text',q.option_d)
      )
    ELSE '[]'::jsonb END AS options,

    -- True/False
    CASE WHEN qt.id = 'true_false' THEN
      (q.correct_answer = 'true')::boolean
    ELSE NULL END AS is_true,

    -- Open/Freetext
    CASE WHEN qt.id = 'open_question' THEN
      jsonb_build_object('selfGraded', true)
    ELSE NULL END AS open_question,

    -- Lückentext
    CASE WHEN qt.id = 'fill_blank' THEN
      jsonb_build_object('correctAnswer', q.correct_answer)
    ELSE NULL END AS fill_blank,

    -- Case‑Subquestions
    CASE WHEN qt.id = 'case_subquestions' THEN
      COALESCE((
        SELECT jsonb_agg(
          jsonb_build_object(
            'id',    cs.id,
            'text',  cs.statement_text,
            'answer',cs.correct_answer
          )
        )
        FROM public.cases_subquestions cs
        WHERE cs.question_id = q.id
      ), '[]'::jsonb)
    ELSE '[]'::jsonb END AS sub_questions,

    -- Sequence‑Steps
    CASE WHEN qt.id = 'sequence' THEN
      COALESCE((
        SELECT jsonb_agg(
          jsonb_build_object(
            'id',       ss.id,
            'title',    ss.title,
            'position', ss.position,
            'level',    ss.level
          ) ORDER BY ss.position
        )
        FROM public.sequence_steps ss
        JOIN public.sequence_blocks sb ON ss.block_id = sb.id
        WHERE sb.question_id = q.id
      ), '[]'::jsonb)
    ELSE '[]'::jsonb END AS sequence_steps,

    -- Drag & Drop
    CASE WHEN qt.id = 'dragdrop' THEN
      COALESCE((
        SELECT jsonb_build_object(
          'groupName', dg.group_name,
          'pairs', (
            SELECT jsonb_agg(
              jsonb_build_object(
                'id',           dp.id,
                'dragText',     dp.drag_text,
                'correctMatch', dp.correct_match
              )
            )
            FROM public.dragdrop_pairs dp
            WHERE dp.group_id = dg.id
          )
        )
        FROM public.dragdrop_groups dg
        WHERE dg.question_id = q.id
      ), '{}'::jsonb)
    ELSE '{}'::jsonb END AS dragdrop,

    -- Dispute‑Modul
    CASE WHEN qt.id = 'dispute' THEN
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
          WHERE dar.dispute_view_id = (
            SELECT dv.id
            FROM public.dispute_views dv
            WHERE dv.dispute_case_id = q.id::text::uuid
            ORDER BY dv.order LIMIT 1
          )
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
    ELSE '{}'::jsonb END AS dispute,

    -- gemeinsame Felder
    q.correct_answer,
    q.explanation

  FROM public.questions q
  JOIN public.question_types qt ON q.question_type_id = qt.id_uuid
  WHERE q.chapter_id = p_chapter_id
) AS qry;
$$;
