

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."award_medal_if_eligible"("p_user_id" "uuid", "p_chapter_id" bigint, "p_progress" integer) RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$declare
  v_medal text;
begin
  -- 1. Medaille bestimmen anhand des Fortschritts
  if p_progress >= 100 then
    v_medal := 'gold';
  elsif p_progress >= 75 then
    v_medal := 'silver';
  elsif p_progress >= 50 then
    v_medal := 'bronze';
  else
    return null; -- keine Medaille bei zu niedrigem Fortschritt
  end if;

  -- 2. Prüfen, ob diese Medaille für dieses Kapitel schon vergeben wurde
  if exists (
    select 1 from public.user_medals
    where user_id = p_user_id
      and chapter_id = p_chapter_id
      and medal = v_medal
  ) then
    return v_medal; -- bereits vergeben, nichts tun
  end if;

  -- 3. Medaille eintragen (INSERT nur wenn noch nicht vorhanden)
  insert into public.user_medals (user_id, chapter_id, medal, awarded_at)
  values (p_user_id, p_chapter_id, v_medal, now());

  return v_medal;
end;$$;


ALTER FUNCTION "public"."award_medal_if_eligible"("p_user_id" "uuid", "p_chapter_id" bigint, "p_progress" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_and_reward_answer"("p_user_id" "uuid", "p_context_id" "uuid", "p_question_type" "text", "p_is_correct" boolean) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_rt            record;
  v_xp            integer;
  v_coins         integer;
BEGIN
  -- Reward‑ und Penalty‑Werte holen
  SELECT id, base_xp, base_coins, xp_penalty, coin_penalty
    INTO v_rt
  FROM public.reward_types
  WHERE question_type = p_question_type
    AND reward_type   = p_question_type || '_reward';

  -- Beträge festlegen
  IF p_is_correct THEN
    v_xp    := v_rt.base_xp;
    v_coins := v_rt.base_coins;
  ELSE
    v_xp    := -v_rt.xp_penalty;
    v_coins := -v_rt.coin_penalty;
  END IF;

  -- Einmal‑Check (keine Doppel‑Belohnung, keine Doppel‑Strafe)
  IF EXISTS (
    SELECT 1
      FROM public.answered_rewards ar
     WHERE ar.user_id             = p_user_id
       AND ar.question_context_id = p_context_id
       AND ar.reward_type_id      = v_rt.id
  ) THEN
    RETURN;
  END IF;

  -- Eintrag in answered_rewards (kann negativ sein)
  INSERT INTO public.answered_rewards (
    user_id,
    question_context_id,
    reward_type_id,
    xp_earned,
    coins_earned
  ) VALUES (
    p_user_id,
    p_context_id,
    v_rt.id,
    v_xp,
    v_coins
  );

  -- User‑Stats updaten (negatives v_coins zieht ab)
  UPDATE public.user_stats
     SET total_xp    = COALESCE(total_xp,0) + v_xp,
         total_coins = COALESCE(total_coins,0) + v_coins
   WHERE user_id = p_user_id;
END;
$$;


ALTER FUNCTION "public"."check_and_reward_answer"("p_user_id" "uuid", "p_context_id" "uuid", "p_question_type" "text", "p_is_correct" boolean) OWNER TO "postgres";


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


ALTER FUNCTION "public"."get_end_screen_details"("p_user_id" "uuid", "p_chapter_id" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_end_screen_summary"("p_user_id" "uuid", "p_chapter_id" bigint) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  v_chapter_name    text;
  v_total_questions integer;
  v_answered_count  integer;
  v_correct_answers integer;
  v_xp_earned       integer;
  v_coins_earned    integer;
  v_progress        integer;
  v_medal           text;
  v_already_awarded boolean;
  v_streak_bonus    integer;
  v_time_taken      interval;
  v_accuracy        integer;
  v_start_level     integer;
  v_level_up_info   jsonb;
begin
  -- 1) Existenz-Check
  if not exists (
    select 1 from public.chapters where id = p_chapter_id
  ) then
    return jsonb_build_object('error', 'Kapitel nicht gefunden');
  end if;

  -- 2) Start-Level speichern
  select coalesce(level, 0)
  into v_start_level
  from public.user_stats
  where user_id = p_user_id;

  -- 3) Kapitel-Name
  select name
  into v_chapter_name
  from public.chapters
  where id = p_chapter_id;

  -- 4) Gesamtzahl der Fragen
  select count(*)
  into v_total_questions
  from public.questions
  where chapter_id = p_chapter_id;

  -- 5) Richtige Antworten zählen
  select count(*)
  into v_correct_answers
  from public.answered_questions
  where user_id = p_user_id
    and chapter_id = p_chapter_id
    and is_correct;

  -- 6) Beantwortete Fragen zählen
  select count(*)
  into v_answered_count
  from public.answered_questions
  where user_id = p_user_id
    and chapter_id = p_chapter_id;

  -- 7) XP & Coins summieren
  select
    coalesce(sum(ar.xp_earned), 0),
    coalesce(sum(ar.coins_earned), 0)
  into v_xp_earned, v_coins_earned
  from public.answered_rewards ar
  join public.questions q on q.id::text = ar.question_context_id::text
    and q.chapter_id = p_chapter_id
  where ar.user_id = p_user_id;

  -- 8) Fortschritt berechnen
  if v_total_questions > 0 then
    v_progress := round((v_answered_count::numeric / v_total_questions::numeric) * 100)::int;
  else
    v_progress := 0;
  end if;

  -- 9) Medaillenstatus anzeigen (aber NICHT vergeben)
  select medal_candidate, already_awarded
  into v_medal, v_already_awarded
  from jsonb_to_record(
    public.get_medal_candidate_with_status(p_user_id, p_chapter_id, v_progress)
  ) as x(medal_candidate text, already_awarded boolean);

  -- 10) Streak-Bonus
  select current_streak
  into v_streak_bonus
  from public.daily_streaks
  where user_id = p_user_id;

  -- 11) Zeit für Kapitel
  select max(answered_at) - min(answered_at)
  into v_time_taken
  from public.answered_questions
  where user_id = p_user_id
    and chapter_id = p_chapter_id;

  -- 12) Genauigkeit berechnen
  if v_total_questions > 0 then
    v_accuracy := round((v_correct_answers::numeric / v_total_questions::numeric) * 100)::int;
  else
    v_accuracy := 0;
  end if;

  -- 13) Level-Up Info
  select jsonb_build_object(
    'did_level_up', l.level_number > v_start_level,
    'old_level', v_start_level,
    'new_level', l.level_number,
    'level_title', l.level_title,
    'level_image', l.level_image
  )
  into v_level_up_info
  from public.levels l
  where l.level_number = (
    select public.get_level(p_user_id)
  );

  -- 14) Ergebnis zurückgeben
  return jsonb_build_object(
    'chapter_name',      v_chapter_name,
    'total_questions',   v_total_questions,
    'answered_questions',v_answered_count,
    'correct_answers',   v_correct_answers,
    'xp_earned',         v_xp_earned,
    'coins_earned',      v_coins_earned,
    'progress',          v_progress,
    'accuracy',          v_accuracy,
    'medal',             v_medal,
    'medal_awarded',     v_already_awarded,
    'streak_bonus',      v_streak_bonus,
    'time_taken',        v_time_taken,
    'level_up',          v_level_up_info
  );

exception
  when others then
    return jsonb_build_object('error', sqlerrm);
end;
$$;


ALTER FUNCTION "public"."get_end_screen_summary"("p_user_id" "uuid", "p_chapter_id" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_global_leaderboard"("p_limit" integer DEFAULT 10) RETURNS TABLE("user_id" "uuid", "total_xp" bigint)
    LANGUAGE "sql" STABLE
    AS $$
SELECT
  us.user_id,
  us.total_xp
FROM public.user_stats us
ORDER BY us.total_xp DESC
LIMIT p_limit;
$$;


ALTER FUNCTION "public"."get_global_leaderboard"("p_limit" integer) OWNER TO "postgres";


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


ALTER FUNCTION "public"."get_incorrect_questions"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_league_leaderboard"("p_league_name" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_league_id bigint;
  v_total_players integer;
  v_json jsonb;
begin
  select id into v_league_id from public.leagues where name = p_league_name;

  if not found then
    return jsonb_build_object('status', 'error', 'message', 'League not found');
  end if;

  select count(*) into v_total_players
  from public.ranked_players
  where current_league = v_league_id;

  select jsonb_agg(jsonb_build_object(
    'user_id', user_id,
    'username', username,
    'avatar_url', avatar_url,
    'university', university,
    'total_xp', total_xp,
    'correct_answers', correct_answers,
    'total_answers', total_answers,
    'level', level,
    'updated_at', updated_at,
    'league_rank', league_rank
  )) into v_json
  from public.league_positions
  where current_league = v_league_id
  order by league_rank;

  return jsonb_build_object(
    'status', 'success',
    'league_info', jsonb_build_object(
      'league_id', v_league_id,
      'name', p_league_name,
      'total_players', v_total_players
    ),
    'rankings', coalesce(v_json, '[]'::jsonb)
  );
end;
$$;


ALTER FUNCTION "public"."get_league_leaderboard"("p_league_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_level_info"("p_user_id" "uuid") RETURNS TABLE("level_number" integer, "level_title" "text", "level_image" "text", "total_xp" bigint, "next_level_xp" bigint, "progress_percent" integer)
    LANGUAGE "sql" STABLE
    AS $$
WITH user_level AS (
  SELECT 
    us.total_xp,
    l.level_number,
    l.level_title,
    l.level_image,
    LEAD(l.xp_required) OVER (ORDER BY l.level_number) as next_level_xp,
    l.xp_required
  FROM public.user_stats us
  JOIN public.levels l ON us.total_xp >= l.xp_required
  WHERE us.user_id = p_user_id
  ORDER BY l.xp_required DESC
  LIMIT 1
)
SELECT
  level_number,
  level_title,
  level_image,
  total_xp,
  next_level_xp,
  CASE 
    WHEN next_level_xp IS NULL THEN 100
    ELSE ((total_xp - xp_required)::float / (next_level_xp - xp_required)::float * 100)::integer
  END as progress_percent
FROM user_level;
$$;


ALTER FUNCTION "public"."get_level_info"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_medal_candidate_with_status"("p_user_id" "uuid", "p_chapter_id" bigint, "p_progress" integer) RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_medal text;
  v_already_awarded boolean;
begin
  -- 1. Medaille nur berechnen, nicht vergeben
  if p_progress >= 100 then
    v_medal := 'gold';
  elsif p_progress >= 75 then
    v_medal := 'silver';
  elsif p_progress >= 50 then
    v_medal := 'bronze';
  else
    return jsonb_build_object(
      'medal_candidate', null,
      'already_awarded', false
    );
  end if;

  -- 2. Prüfen, ob diese Medaille schon vergeben wurde
  select exists (
    select 1 from public.user_medals
    where user_id = p_user_id
      and chapter_id = p_chapter_id
      and medal = v_medal
  ) into v_already_awarded;

  -- 3. JSON-Antwort zurückgeben
  return jsonb_build_object(
    'medal_candidate', v_medal,
    'already_awarded', v_already_awarded
  );
end;
$$;


ALTER FUNCTION "public"."get_medal_candidate_with_status"("p_user_id" "uuid", "p_chapter_id" bigint, "p_progress" integer) OWNER TO "postgres";


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


ALTER FUNCTION "public"."get_question_detail"("p_question_id" bigint) OWNER TO "postgres";


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


ALTER FUNCTION "public"."get_questions_by_chapter"("p_chapter_id" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_quiz_progress"("p_user_id" "uuid") RETURNS TABLE("chapter_id" bigint, "progress" integer)
    LANGUAGE "sql" STABLE
    AS $$
  SELECT chapter_id, progress
    FROM public.quiz_progress
   WHERE user_id = p_user_id;
$$;


ALTER FUNCTION "public"."get_quiz_progress"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_reward_status"("p_user_id" "uuid", "p_context_id" "uuid") RETURNS TABLE("question_type" "text", "reward_type" "text", "is_rewarded" boolean, "xp_earned" integer, "coins_earned" integer)
    LANGUAGE "sql" STABLE
    AS $$
  SELECT
    rt.question_type,
    rt.reward_type,
    (ar.id IS NOT NULL)           AS is_rewarded,
    COALESCE(ar.xp_earned,0)      AS xp_earned,
    COALESCE(ar.coins_earned,0)   AS coins_earned
  FROM public.reward_types rt
  LEFT JOIN public.answered_rewards ar
    ON ar.reward_type_id      = rt.id
   AND ar.user_id             = p_user_id
   AND ar.question_context_id = p_context_id
  ORDER BY rt.question_type;
$$;


ALTER FUNCTION "public"."get_reward_status"("p_user_id" "uuid", "p_context_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_shop_items"() RETURNS TABLE("id" "uuid", "name" "text", "description" "text", "price" integer, "type" "text", "icon_url" "text")
    LANGUAGE "sql" STABLE
    AS $$
  SELECT 
    i.id,
    i.name,
    i.description,
    i.price,
    i.type,
    i.icon_url
  FROM public.items i
  ORDER BY i.type, i.price;
$$;


ALTER FUNCTION "public"."get_shop_items"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_streak_status"("p_user_id" "uuid") RETURNS TABLE("current_streak" integer, "last_active_date" "date", "max_streak" integer)
    LANGUAGE "sql" STABLE
    AS $$
SELECT
  COALESCE(current_streak, 0),
  last_active_date,
  COALESCE(max_streak, 0)
FROM public.daily_streaks
WHERE user_id = p_user_id;
$$;


ALTER FUNCTION "public"."get_streak_status"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_university_contributors"("p_university_id" bigint, "p_month" "date" DEFAULT "date_trunc"('month'::"text", (CURRENT_DATE)::timestamp with time zone)) RETURNS TABLE("user_id" "uuid", "username" "text", "monthly_xp" bigint, "rank" bigint)
    LANGUAGE "sql" STABLE
    AS $$
SELECT 
    p.id as user_id,
    p.username,
    COALESCE(SUM(ar.xp_earned), 0)::bigint as monthly_xp,
    RANK() OVER (ORDER BY SUM(ar.xp_earned) DESC) as rank
FROM public.profiles p
LEFT JOIN public.answered_rewards ar 
    ON ar.user_id = p.id 
    AND date_trunc('month', ar.created_at) = p_month
WHERE p.university = (p_university_id)::text  -- Cast p_university_id to text
GROUP BY p.id, p.username
ORDER BY monthly_xp DESC;
$$;


ALTER FUNCTION "public"."get_university_contributors"("p_university_id" bigint, "p_month" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_university_ranking"() RETURNS TABLE("university_id" bigint, "name" "text", "score" bigint, "rank" bigint, "month" "date")
    LANGUAGE "sql" STABLE
    AS $$
SELECT 
    m.university_id,
    u.name,                -- ✅ korrekt aus universities
    m.score,
    RANK() OVER (PARTITION BY m.month ORDER BY m.score DESC) as rank,
    m.month
FROM public.monthly_uni_scores m
JOIN public.universities u ON u.id = m.university_id
WHERE m.month = date_trunc('month', current_date)
ORDER BY rank;
$$;


ALTER FUNCTION "public"."get_university_ranking"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_items"("p_user_id" "uuid") RETURNS TABLE("item_id" "uuid", "name" "text", "description" "text", "type" "text", "icon_url" "text", "quantity" integer, "is_active" boolean, "acquired_at" timestamp without time zone)
    LANGUAGE "sql" STABLE
    AS $$
  SELECT
    ui.item_id,
    i.name,
    i.description,
    i.type,
    i.icon_url,
    ui.quantity,
    ui.is_active,
    ui.acquired_at
  FROM public.user_items ui
  JOIN public.items i ON ui.item_id = i.id
  WHERE ui.user_id = p_user_id
  ORDER BY i.type, i.name;
$$;


ALTER FUNCTION "public"."get_user_items"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_profile"("p_user_id" "uuid") RETURNS "jsonb"
    LANGUAGE "sql" STABLE
    AS $$
WITH level_info AS (
  SELECT * FROM public.get_level_info(p_user_id)
)
SELECT jsonb_build_object(
  'xp',             us.total_xp,
  'coins',          us.total_coins,
  'level',          li.level_number,                   -- ⬅️ Korrigiert von new_level
  'level_title',    li.level_title,
  'level_image',    li.level_image,
  'title',          us.title,
  'current_streak', COALESCE(ds.current_streak, 0),
  'max_streak',     COALESCE(ds.max_streak, 0),
  'avatar_url',     COALESCE(sa.image_url, ''),
  'medals',         jsonb_build_object(
                      'gold',   us.gold_medals,
                      'silver', us.silver_medals,
                      'bronze', us.bronze_medals
                    ),
  'items',          COALESCE((SELECT jsonb_agg(jsonb_build_object(
                      'item_id', ui.item_id,
                      'quantity', ui.quantity
                    ))
                    FROM public.user_items ui
                    WHERE ui.user_id = p_user_id), '[]'::jsonb),
  'questions_answered', us.questions_answered,
  'correct_answers',    us.correct_answers,
  'last_active',        ds.last_active_date
)
FROM public.user_stats us
LEFT JOIN public.daily_streaks ds
  ON ds.user_id = us.user_id
LEFT JOIN public.user_avatars ua
  ON ua.user_id = us.user_id
LEFT JOIN public.shop_avatars sa
  ON sa.id = ua.avatar_id
CROSS JOIN level_info li
WHERE us.user_id = p_user_id;
$$;


ALTER FUNCTION "public"."get_user_profile"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."level_up_if_eligible"("p_user_id" "uuid") RETURNS TABLE("new_level" integer, "did_level_up" boolean, "level_title" "text", "level_image" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_new_level integer;
  v_old_level integer;
BEGIN
  -- Aktuelles Level speichern
  SELECT COALESCE(level, 0) INTO v_old_level
  FROM public.user_stats
  WHERE user_id = p_user_id;

  -- Neues Level berechnen
  SELECT public.get_level(p_user_id) INTO v_new_level;

  -- Nur updaten wenn Level-Up
  IF v_new_level > v_old_level THEN
    UPDATE public.user_stats
    SET level = v_new_level
    WHERE user_id = p_user_id;
  END IF;

  -- Ergebnis mit Level-Details zurückgeben
  RETURN QUERY
  SELECT 
    v_new_level as new_level,
    (v_new_level > v_old_level) as did_level_up,
    l.level_title,              -- aus schema_.sql
    l.level_image               -- aus schema_.sql
  FROM public.levels l
  WHERE l.level_number = v_new_level;

END;
$$;


ALTER FUNCTION "public"."level_up_if_eligible"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."purchase_item"("p_user_id" "uuid", "p_item_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_price      integer;
  v_coins      integer;
  v_quantity   integer;
  v_now        timestamp := now();
  v_response   jsonb;
BEGIN
  -- 1) Preis und aktuelle Coins abrufen
  SELECT i.price INTO v_price FROM public.items i WHERE i.id = p_item_id;
  SELECT total_coins INTO v_coins FROM public.user_stats WHERE user_id = p_user_id;

  IF v_coins < v_price THEN
    RETURN jsonb_build_object('error','Nicht genug Coins');
  END IF;

  -- 2) Coins abziehen
  UPDATE public.user_stats
  SET total_coins = total_coins - v_price
  WHERE user_id = p_user_id;

  -- 3) Item ins Inventar legen / Quantity erhöhen
  SELECT quantity INTO v_quantity
  FROM public.user_items
  WHERE user_id = p_user_id AND item_id = p_item_id;

  IF FOUND THEN
    UPDATE public.user_items
    SET quantity = quantity + 1
    WHERE user_id = p_user_id AND item_id = p_item_id;
  ELSE
    INSERT INTO public.user_items(user_id,item_id,quantity,is_active,acquired_at)
    VALUES(p_user_id,p_item_id,1,true,v_now);
  END IF;

  -- 4) Antwort zurückgeben
  v_response := jsonb_build_object(
    'status', 'success',
    'remaining_coins', (v_coins - v_price)
  );
  RETURN v_response;
END;
$$;


ALTER FUNCTION "public"."purchase_item"("p_user_id" "uuid", "p_item_id" "uuid") OWNER TO "postgres";


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


ALTER FUNCTION "public"."report_question"("p_user_id" "uuid", "p_question_id" bigint, "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reset_leagues"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
declare
  r record;
begin
  for r in
    select * from (
      select user_id, current_league,
        row_number() over (partition by current_league order by total_xp desc) as rank
      from public.ranked_players
    ) sub
  loop
    if r.rank <= 10 then
      update public.user_stats
      set current_league = current_league + 1
      where user_id = r.user_id;
    elsif r.rank > 50 then
      update public.user_stats
      set current_league = greatest(current_league - 1, 1)
      where user_id = r.user_id;
    end if;
  end loop;
end;
$$;


ALTER FUNCTION "public"."reset_leagues"() OWNER TO "postgres";


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


ALTER FUNCTION "public"."resolve_question_report"("p_report_id" bigint, "p_status" "text", "p_notes" "text") OWNER TO "postgres";


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


CREATE OR REPLACE FUNCTION "public"."update_avatar"("p_user_id" "uuid", "p_avatar_id" bigint) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_image_url text;
BEGIN
  -- Prüfen ob Avatar existiert
  SELECT image_url INTO v_image_url
  FROM public.shop_avatars
  WHERE id = p_avatar_id;
  
  IF v_image_url IS NULL THEN
    RETURN jsonb_build_object('error', 'Avatar nicht gefunden');
  END IF;

  -- Avatar zuweisen
  INSERT INTO public.user_avatars(
    user_id,
    avatar_id
  )
  VALUES (
    p_user_id,
    p_avatar_id
  )
  ON CONFLICT (user_id) DO UPDATE
    SET avatar_id = EXCLUDED.avatar_id;

  RETURN jsonb_build_object(
    'status', 'ok',
    'avatar_id', p_avatar_id,
    'image_url', v_image_url
  );
EXCEPTION 
  WHEN OTHERS THEN
    RETURN jsonb_build_object('error', SQLERRM);
END;
$$;


ALTER FUNCTION "public"."update_avatar"("p_user_id" "uuid", "p_avatar_id" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_daily_streak"("p_user_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$declare
  v_last_date      date;
  v_current_streak integer;
  v_new_streak     integer;
  v_today          date := timezone('Europe/Berlin', now())::date;
begin
  -- Bestehenden Record laden (falls vorhanden)
  select last_active_date, current_streak
    into v_last_date, v_current_streak
  from public.daily_streaks
  where user_id = p_user_id;

  -- 1a) Hat der Nutzer heute schon gespielt?
  if v_last_date = v_today then
    v_new_streak := v_current_streak;

  -- 1b) Hat er gestern gespielt?
  elsif v_last_date = v_today - interval '1 day' then
    v_new_streak := v_current_streak + 1;

  -- 1c) Sonst (erstes Mal oder Pause > 1 Tag): Streak neu starten
  else
    v_new_streak := 1;
  end if;

  -- Upsert inkl. max_streak-Update
  insert into public.daily_streaks(user_id, current_streak, last_active_date, max_streak)
  values (p_user_id, v_new_streak, v_today, v_new_streak)
  on conflict (user_id) do update
    set current_streak   = excluded.current_streak,
        last_active_date = excluded.last_active_date,
        max_streak       = greatest(excluded.current_streak, public.daily_streaks.max_streak);

  return v_new_streak;

exception
  when others then
    return 0;
end;$$;


ALTER FUNCTION "public"."update_daily_streak"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."use_item"("p_user_id" "uuid", "p_item_id" "uuid", "p_metadata" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_quantity integer;
  v_now      timestamp := now();
  v_response jsonb;
BEGIN
  -- 1) Prüfen, ob Item aktiv und vorhanden ist
  SELECT quantity INTO v_quantity
  FROM public.user_items
  WHERE user_id = p_user_id AND item_id = p_item_id AND is_active = true;

  IF v_quantity IS NULL OR v_quantity < 1 THEN
    RETURN jsonb_build_object('error','Item nicht verfügbar');
  END IF;

  -- 2) Quantity verringern und ggf. deaktivieren
  UPDATE public.user_items
  SET quantity = quantity - 1,
      is_active = (quantity - 1 > 0)
  WHERE user_id = p_user_id AND item_id = p_item_id;

  -- 3) Loggen
  INSERT INTO public.item_usage_log(user_id,item_id,used_at,metadata)
  VALUES(p_user_id,p_item_id,v_now,p_metadata);

  v_response := jsonb_build_object('status','used');
  RETURN v_response;
END;
$$;


ALTER FUNCTION "public"."use_item"("p_user_id" "uuid", "p_item_id" "uuid", "p_metadata" "jsonb") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."answered_questions" (
    "id" bigint NOT NULL,
    "user_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "question_id" bigint,
    "is_correct" boolean,
    "answered_at" timestamp with time zone,
    "chapter_id" integer
);


ALTER TABLE "public"."answered_questions" OWNER TO "postgres";


ALTER TABLE "public"."answered_questions" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."answered_questions_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."answered_rewards" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "question_context_id" "uuid",
    "reward_type_id" "uuid",
    "xp_earned" integer NOT NULL,
    "coins_earned" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."answered_rewards" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."case_sequence_steps" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "dispute_case_id" "uuid",
    "sequence_step_id" "uuid",
    "correct_order" integer NOT NULL,
    "parent_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."case_sequence_steps" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cases_subquestions" (
    "id" bigint NOT NULL,
    "question_id" bigint NOT NULL,
    "statement_text" "text" NOT NULL,
    "correct_answer" "text" NOT NULL,
    "explanation" "text"
);


ALTER TABLE "public"."cases_subquestions" OWNER TO "postgres";


ALTER TABLE "public"."cases_subquestions" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."cases_subquestions_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."questions" (
    "id" bigint NOT NULL,
    "chapter_id" bigint NOT NULL,
    "question" "text",
    "option_a" "text",
    "option_b" "text",
    "option_c" "text",
    "option_d" "text",
    "correct_answer" "text",
    "explanation" "text",
    "course_id" bigint,
    "subquestions_count" integer DEFAULT 0,
    "question_type_id" "uuid",
    CONSTRAINT "question_type_not_null" CHECK (("question_type_id" IS NOT NULL))
);


ALTER TABLE "public"."questions" OWNER TO "postgres";


CREATE MATERIALIZED VIEW "public"."chapter_stats" AS
 SELECT "q"."chapter_id",
    "count"(*) AS "total_questions",
    "avg"(
        CASE
            WHEN "aq"."is_correct" THEN 1.0
            ELSE 0.0
        END) AS "avg_success_rate"
   FROM ("public"."answered_questions" "aq"
     JOIN "public"."questions" "q" ON (("q"."id" = "aq"."question_id")))
  GROUP BY "q"."chapter_id"
  WITH NO DATA;


ALTER TABLE "public"."chapter_stats" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."chapters" (
    "id" bigint NOT NULL,
    "course_id" bigint NOT NULL,
    "name" "text"
);


ALTER TABLE "public"."chapters" OWNER TO "postgres";


ALTER TABLE "public"."chapters" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."chapters_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."courses" (
    "id" bigint NOT NULL,
    "subject_id" bigint NOT NULL,
    "name" "text"
);


ALTER TABLE "public"."courses" OWNER TO "postgres";


ALTER TABLE "public"."courses" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."courses_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "username" "text",
    "avatar_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "university" "text"
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_stats" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "total_xp" bigint,
    "total_coins" bigint,
    "level" bigint,
    "title" "text",
    "created_at" timestamp with time zone,
    "streak" integer,
    "avatar_url" "text",
    "gold_medals" integer DEFAULT 0,
    "silver_medals" integer DEFAULT 0,
    "bronze_medals" integer DEFAULT 0,
    "last_played" timestamp with time zone,
    "current_league" "text",
    "updated_at" timestamp with time zone,
    "league_group" "text",
    "username" "text",
    "questions_answered" bigint,
    "correct_answers" bigint,
    CONSTRAINT "positive_coins" CHECK (("total_coins" >= 0)),
    CONSTRAINT "positive_xp" CHECK (("total_xp" >= 0)),
    CONSTRAINT "valid_level" CHECK (("level" > 0))
);


ALTER TABLE "public"."user_stats" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."ranked_players" AS
 SELECT "u"."id" AS "user_id",
    "u"."username",
    "u"."avatar_url",
    "u"."university",
    "s"."current_league",
    "sum"("r"."xp_earned") AS "total_xp",
    "count"("aq"."question_id") FILTER (WHERE "aq"."is_correct") AS "correct_answers",
    "count"("aq"."question_id") AS "total_answers",
    "s"."level",
    "max"("r"."created_at") AS "updated_at"
   FROM ((("public"."profiles" "u"
     JOIN "public"."user_stats" "s" ON (("u"."id" = "s"."user_id")))
     LEFT JOIN "public"."answered_rewards" "r" ON (("u"."id" = "r"."user_id")))
     LEFT JOIN "public"."answered_questions" "aq" ON (("aq"."user_id" = "u"."id")))
  GROUP BY "u"."id", "u"."username", "u"."avatar_url", "u"."university", "s"."current_league", "s"."level";


ALTER TABLE "public"."ranked_players" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."current_league_positions" AS
 SELECT "ranked_players"."user_id",
    "ranked_players"."username",
    "ranked_players"."avatar_url",
    "ranked_players"."university",
    "ranked_players"."current_league",
    "ranked_players"."total_xp",
    "ranked_players"."correct_answers",
    "ranked_players"."total_answers",
    "ranked_players"."level",
    "ranked_players"."updated_at",
    "row_number"() OVER (PARTITION BY "ranked_players"."current_league" ORDER BY "ranked_players"."total_xp" DESC) AS "league_rank"
   FROM "public"."ranked_players";


ALTER TABLE "public"."current_league_positions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."daily_streaks" (
    "user_id" "uuid" NOT NULL,
    "current_streak" integer DEFAULT 1,
    "last_active_date" "date" NOT NULL,
    "last_updated" timestamp with time zone,
    "max_streak" integer DEFAULT 1 NOT NULL
);


ALTER TABLE "public"."daily_streaks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."dispute_answers" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "dispute_question_id" "uuid",
    "answer_text" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."dispute_answers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."dispute_arguments" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "dispute_view_id" "uuid",
    "argument_text" "text" NOT NULL,
    "order" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."dispute_arguments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."dispute_cases" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_active" boolean DEFAULT true,
    "chapter_id" bigint
);


ALTER TABLE "public"."dispute_cases" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."dispute_preferences" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "dispute_case_id" "uuid",
    "view_id" "uuid",
    "preference_order" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."dispute_preferences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."dispute_questions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "dispute_case_id" "uuid",
    "question_type" "text" NOT NULL,
    "question_text" "text" NOT NULL,
    "order" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "dispute_questions_question_type_check" CHECK (("question_type" = ANY (ARRAY['problem'::"text", 'view'::"text", 'detail'::"text", 'argument'::"text"])))
);


ALTER TABLE "public"."dispute_questions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."dispute_views" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "dispute_case_id" "uuid",
    "view_name" "text" NOT NULL,
    "description" "text" NOT NULL,
    "exam_relevance" "text",
    "exam_preference_order" integer,
    "order" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."dispute_views" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."dragdrop_groups" (
    "id" bigint NOT NULL,
    "question_id" bigint NOT NULL,
    "group_name" "text"
);


ALTER TABLE "public"."dragdrop_groups" OWNER TO "postgres";


ALTER TABLE "public"."dragdrop_groups" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."dragdrop_groups_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."dragdrop_pairs" (
    "id" bigint NOT NULL,
    "group_id" bigint NOT NULL,
    "drag_text" "text",
    "correct_match" "text"
);


ALTER TABLE "public"."dragdrop_pairs" OWNER TO "postgres";


ALTER TABLE "public"."dragdrop_pairs" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."dragdrop_pairs_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."item_usage_log" (
    "id" integer NOT NULL,
    "user_id" "uuid",
    "item_id" integer,
    "used_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."item_usage_log" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."item_usage_log_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."item_usage_log_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."item_usage_log_id_seq" OWNED BY "public"."item_usage_log"."id";



CREATE TABLE IF NOT EXISTS "public"."items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "price" integer NOT NULL,
    "type" "text",
    "icon_url" "text",
    CONSTRAINT "items_type_check" CHECK (("type" = ANY (ARRAY['joker'::"text", 'avatar'::"text", 'pvp_boost'::"text", 'cosmetic'::"text"])))
);


ALTER TABLE "public"."items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."league_positions" (
    "user_id" "uuid" NOT NULL,
    "league_name" "text" NOT NULL,
    "points" bigint DEFAULT 0,
    "ranking" integer,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."league_positions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."leagues" (
    "id" bigint NOT NULL,
    "name" "text" NOT NULL,
    "league_img" "text",
    "next_league" "text",
    "previous_league" "text"
);


ALTER TABLE "public"."leagues" OWNER TO "postgres";


ALTER TABLE "public"."leagues" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."leagues_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."levels" (
    "id" integer NOT NULL,
    "level_number" integer NOT NULL,
    "xp_required" bigint NOT NULL,
    "level_image" "text",
    "level_title" "text"
);


ALTER TABLE "public"."levels" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."levels_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."levels_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."levels_id_seq" OWNED BY "public"."levels"."id";



CREATE TABLE IF NOT EXISTS "public"."match_participants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "match_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "joined_at" timestamp without time zone DEFAULT "now"(),
    "score" integer DEFAULT 0
);


ALTER TABLE "public"."match_participants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."medals" (
    "id" "text" NOT NULL,
    "name" "text",
    "description" "text",
    "icon_url" "text"
);


ALTER TABLE "public"."medals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."monthly_uni_scores" (
    "id" bigint NOT NULL,
    "university_id" bigint NOT NULL,
    "score" bigint DEFAULT 0 NOT NULL,
    "month" "date" NOT NULL
);


ALTER TABLE "public"."monthly_uni_scores" OWNER TO "postgres";


ALTER TABLE "public"."monthly_uni_scores" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."monthly_uni_scores_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."multiple_choice_options" (
    "id" bigint NOT NULL,
    "question_id" bigint NOT NULL,
    "option_text" "text" NOT NULL,
    "is_correct" boolean NOT NULL
);


ALTER TABLE "public"."multiple_choice_options" OWNER TO "postgres";


ALTER TABLE "public"."multiple_choice_options" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."multiple_choice_options_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."pvp_answers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "match_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "question_id" bigint NOT NULL,
    "is_correct" boolean,
    "answered_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."pvp_answers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pvp_matches" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "quiz_id" "uuid",
    "status" "text" DEFAULT 'pending'::"text",
    "mode" "text" NOT NULL,
    CONSTRAINT "pvp_matches_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'active'::"text", 'finished'::"text"])))
);


ALTER TABLE "public"."pvp_matches" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pvp_participants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "match_id" "uuid",
    "user_id" "uuid",
    "hp" integer DEFAULT 100,
    "score" integer DEFAULT 0,
    "finished" boolean DEFAULT false
);


ALTER TABLE "public"."pvp_participants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pvp_responses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "match_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "question_id" bigint NOT NULL,
    "is_correct" boolean,
    "damage_done" integer DEFAULT 0,
    "self_damage" integer DEFAULT 0,
    "answered_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."pvp_responses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."question_reports" (
    "id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "question_id" bigint NOT NULL,
    "reason" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "resolved_at" timestamp without time zone,
    "resolver_notes" "text"
);


ALTER TABLE "public"."question_reports" OWNER TO "postgres";


ALTER TABLE "public"."question_reports" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."question_reports_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."question_types" (
    "id" "text" NOT NULL,
    "base_xp" integer DEFAULT 10 NOT NULL,
    "base_coins" integer DEFAULT 10 NOT NULL,
    "is_bonus" boolean DEFAULT false,
    "base_lose_coins" integer,
    "bonus_table" "text",
    "bonus_column" "text",
    "uuid_id" "uuid" DEFAULT "gen_random_uuid"(),
    "id_uuid" "uuid" DEFAULT "gen_random_uuid"() NOT NULL
);


ALTER TABLE "public"."question_types" OWNER TO "postgres";


ALTER TABLE "public"."questions" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."questions_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."quiz_progress" (
    "id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "chapter_id" integer NOT NULL,
    "progress" integer DEFAULT 0 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."quiz_progress" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."quiz_progress_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."quiz_progress_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."quiz_progress_id_seq" OWNED BY "public"."quiz_progress"."id";



CREATE TABLE IF NOT EXISTS "public"."reward_types" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "question_type" "text",
    "reward_type" "text" NOT NULL,
    "base_xp" integer NOT NULL,
    "base_coins" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "xp_penalty" integer DEFAULT 0 NOT NULL,
    "coin_penalty" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."reward_types" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sequence_blocks" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "title" "text" NOT NULL,
    "chapter_id" bigint,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "question_id" bigint
);


ALTER TABLE "public"."sequence_blocks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sequence_steps" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "title" "text" NOT NULL,
    "level" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "position" integer DEFAULT 1 NOT NULL,
    "block_id" "uuid"
);


ALTER TABLE "public"."sequence_steps" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."shop_avatars" (
    "id" integer NOT NULL,
    "image_url" "text" NOT NULL,
    "price" integer NOT NULL,
    "active" boolean DEFAULT true,
    "title" "text",
    "category" "text"
);


ALTER TABLE "public"."shop_avatars" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."shop_avatars_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."shop_avatars_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."shop_avatars_id_seq" OWNED BY "public"."shop_avatars"."id";



CREATE TABLE IF NOT EXISTS "public"."subjects" (
    "id" bigint NOT NULL,
    "name" "text" NOT NULL
);


ALTER TABLE "public"."subjects" OWNER TO "postgres";


ALTER TABLE "public"."subjects" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."subjects_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."universities" (
    "id" integer NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "xp_total" bigint
);


ALTER TABLE "public"."universities" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."universities_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."universities_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."universities_id_seq" OWNED BY "public"."universities"."id";



CREATE TABLE IF NOT EXISTS "public"."user_avatars" (
    "user_id" "uuid" NOT NULL,
    "avatar_id" bigint NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_avatars" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_items" (
    "user_id" "uuid" NOT NULL,
    "is_active" boolean DEFAULT true,
    "quantity" integer DEFAULT 1,
    "acquired_at" timestamp without time zone DEFAULT "now"(),
    "item_id" "uuid"
);


ALTER TABLE "public"."user_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_medals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "medal" "text" NOT NULL,
    "awarded_at" timestamp without time zone DEFAULT "now"(),
    "chapter_id" bigint,
    CONSTRAINT "user_medals_medal_check" CHECK (("medal" = ANY (ARRAY['bronze'::"text", 'silver'::"text", 'gold'::"text"])))
);


ALTER TABLE "public"."user_medals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "role" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "user_roles_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'user'::"text"])))
);


ALTER TABLE "public"."user_roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."versions" (
    "id" integer NOT NULL,
    "table_name" character varying(255) NOT NULL,
    "data" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."versions" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."versions_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."versions_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."versions_id_seq" OWNED BY "public"."versions"."id";



ALTER TABLE ONLY "public"."item_usage_log" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."item_usage_log_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."levels" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."levels_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."quiz_progress" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."quiz_progress_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."shop_avatars" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."shop_avatars_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."universities" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."universities_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."versions" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."versions_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."answered_questions"
    ADD CONSTRAINT "answered_questions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."answered_rewards"
    ADD CONSTRAINT "answered_rewards_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."answered_rewards"
    ADD CONSTRAINT "answered_rewards_user_id_dispute_case_id_reward_type_id_key" UNIQUE ("user_id", "question_context_id", "reward_type_id");



ALTER TABLE ONLY "public"."case_sequence_steps"
    ADD CONSTRAINT "case_sequence_steps_dispute_case_id_sequence_step_id_key" UNIQUE ("dispute_case_id", "sequence_step_id");



ALTER TABLE ONLY "public"."case_sequence_steps"
    ADD CONSTRAINT "case_sequence_steps_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cases_subquestions"
    ADD CONSTRAINT "cases_subquestions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chapters"
    ADD CONSTRAINT "chapters_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."courses"
    ADD CONSTRAINT "courses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."daily_streaks"
    ADD CONSTRAINT "daily_streaks_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."dispute_answers"
    ADD CONSTRAINT "dispute_answers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dispute_answers"
    ADD CONSTRAINT "dispute_answers_user_id_dispute_question_id_key" UNIQUE ("user_id", "dispute_question_id");



ALTER TABLE ONLY "public"."dispute_arguments"
    ADD CONSTRAINT "dispute_arguments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dispute_cases"
    ADD CONSTRAINT "dispute_cases_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dispute_preferences"
    ADD CONSTRAINT "dispute_preferences_dispute_case_id_view_id_key" UNIQUE ("dispute_case_id", "view_id");



ALTER TABLE ONLY "public"."dispute_preferences"
    ADD CONSTRAINT "dispute_preferences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dispute_questions"
    ADD CONSTRAINT "dispute_questions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dispute_views"
    ADD CONSTRAINT "dispute_views_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dragdrop_groups"
    ADD CONSTRAINT "dragdrop_groups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dragdrop_pairs"
    ADD CONSTRAINT "dragdrop_pairs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."item_usage_log"
    ADD CONSTRAINT "item_usage_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."items"
    ADD CONSTRAINT "items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."league_positions"
    ADD CONSTRAINT "league_positions_pkey" PRIMARY KEY ("user_id", "league_name");



ALTER TABLE ONLY "public"."leagues"
    ADD CONSTRAINT "leagues_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."levels"
    ADD CONSTRAINT "levels_level_number_key" UNIQUE ("level_number");



ALTER TABLE ONLY "public"."levels"
    ADD CONSTRAINT "levels_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."match_participants"
    ADD CONSTRAINT "match_participants_match_id_user_id_key" UNIQUE ("match_id", "user_id");



ALTER TABLE ONLY "public"."match_participants"
    ADD CONSTRAINT "match_participants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."medals"
    ADD CONSTRAINT "medals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."monthly_uni_scores"
    ADD CONSTRAINT "monthly_uni_scores_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."monthly_uni_scores"
    ADD CONSTRAINT "monthly_uni_scores_unique" UNIQUE ("university_id", "month");



ALTER TABLE ONLY "public"."multiple_choice_options"
    ADD CONSTRAINT "multiple_choice_options_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pvp_answers"
    ADD CONSTRAINT "pvp_answers_match_id_user_id_question_id_key" UNIQUE ("match_id", "user_id", "question_id");



ALTER TABLE ONLY "public"."pvp_answers"
    ADD CONSTRAINT "pvp_answers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pvp_matches"
    ADD CONSTRAINT "pvp_matches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pvp_participants"
    ADD CONSTRAINT "pvp_participants_match_id_user_id_key" UNIQUE ("match_id", "user_id");



ALTER TABLE ONLY "public"."pvp_participants"
    ADD CONSTRAINT "pvp_participants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pvp_responses"
    ADD CONSTRAINT "pvp_responses_match_id_user_id_question_id_key" UNIQUE ("match_id", "user_id", "question_id");



ALTER TABLE ONLY "public"."pvp_responses"
    ADD CONSTRAINT "pvp_responses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."question_reports"
    ADD CONSTRAINT "question_reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."question_reports"
    ADD CONSTRAINT "question_reports_user_id_question_id_key" UNIQUE ("user_id", "question_id");



ALTER TABLE ONLY "public"."question_types"
    ADD CONSTRAINT "question_types_id_unique" UNIQUE ("id");



ALTER TABLE ONLY "public"."question_types"
    ADD CONSTRAINT "question_types_pkey_uuid" PRIMARY KEY ("id_uuid");



ALTER TABLE ONLY "public"."questions"
    ADD CONSTRAINT "questions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quiz_progress"
    ADD CONSTRAINT "quiz_progress_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quiz_progress"
    ADD CONSTRAINT "quiz_progress_user_id_chapter_id_key" UNIQUE ("user_id", "chapter_id");



ALTER TABLE ONLY "public"."reward_types"
    ADD CONSTRAINT "reward_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reward_types"
    ADD CONSTRAINT "reward_types_question_type_reward_type_key" UNIQUE ("question_type", "reward_type");



ALTER TABLE ONLY "public"."sequence_blocks"
    ADD CONSTRAINT "sequence_blocks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sequence_steps"
    ADD CONSTRAINT "sequence_steps_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shop_avatars"
    ADD CONSTRAINT "shop_avatars_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subjects"
    ADD CONSTRAINT "subjects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sequence_steps"
    ADD CONSTRAINT "unique_step_position_per_block" UNIQUE ("block_id", "position");



ALTER TABLE ONLY "public"."universities"
    ADD CONSTRAINT "universities_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."universities"
    ADD CONSTRAINT "universities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_avatars"
    ADD CONSTRAINT "user_avatars_pkey" PRIMARY KEY ("user_id", "avatar_id");



ALTER TABLE ONLY "public"."user_medals"
    ADD CONSTRAINT "user_medals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_role_key" UNIQUE ("user_id", "role");



ALTER TABLE ONLY "public"."user_stats"
    ADD CONSTRAINT "user_stats_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_stats"
    ADD CONSTRAINT "user_stats_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."versions"
    ADD CONSTRAINT "versions_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_answered_rewards_case_id" ON "public"."answered_rewards" USING "btree" ("question_context_id");



CREATE INDEX "idx_answered_rewards_type_id" ON "public"."answered_rewards" USING "btree" ("reward_type_id");



CREATE INDEX "idx_answered_rewards_user_id" ON "public"."answered_rewards" USING "btree" ("user_id");



CREATE INDEX "idx_case_sequence_steps_case_id" ON "public"."case_sequence_steps" USING "btree" ("dispute_case_id");



CREATE INDEX "idx_case_sequence_steps_step_id" ON "public"."case_sequence_steps" USING "btree" ("sequence_step_id");



CREATE INDEX "idx_chapter_stats_chapter" ON "public"."chapter_stats" USING "btree" ("chapter_id");



CREATE INDEX "idx_dispute_answers_question_id" ON "public"."dispute_answers" USING "btree" ("dispute_question_id");



CREATE INDEX "idx_dispute_answers_user_id" ON "public"."dispute_answers" USING "btree" ("user_id");



CREATE INDEX "idx_dispute_arguments_view_id" ON "public"."dispute_arguments" USING "btree" ("dispute_view_id");



CREATE INDEX "idx_dispute_preferences_case_id" ON "public"."dispute_preferences" USING "btree" ("dispute_case_id");



CREATE INDEX "idx_dispute_questions_case_id" ON "public"."dispute_questions" USING "btree" ("dispute_case_id");



CREATE INDEX "idx_dispute_views_case_id" ON "public"."dispute_views" USING "btree" ("dispute_case_id");



CREATE INDEX "idx_questions_chapter_id" ON "public"."questions" USING "btree" ("chapter_id");



CREATE INDEX "idx_sequence_steps_position" ON "public"."sequence_steps" USING "btree" ("position");



CREATE INDEX "idx_user_stats_user_id" ON "public"."user_stats" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "update_case_sequence_steps_updated_at" BEFORE UPDATE ON "public"."case_sequence_steps" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_sequence_steps_updated_at" BEFORE UPDATE ON "public"."sequence_steps" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."answered_questions"
    ADD CONSTRAINT "answered_questions_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id");



ALTER TABLE ONLY "public"."answered_questions"
    ADD CONSTRAINT "answered_questions_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id");



ALTER TABLE ONLY "public"."answered_rewards"
    ADD CONSTRAINT "answered_rewards_dispute_case_id_fkey" FOREIGN KEY ("question_context_id") REFERENCES "public"."dispute_cases"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."answered_rewards"
    ADD CONSTRAINT "answered_rewards_reward_type_id_fkey" FOREIGN KEY ("reward_type_id") REFERENCES "public"."reward_types"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."answered_rewards"
    ADD CONSTRAINT "answered_rewards_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."case_sequence_steps"
    ADD CONSTRAINT "case_sequence_steps_dispute_case_id_fkey" FOREIGN KEY ("dispute_case_id") REFERENCES "public"."dispute_cases"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."case_sequence_steps"
    ADD CONSTRAINT "case_sequence_steps_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."sequence_steps"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."case_sequence_steps"
    ADD CONSTRAINT "case_sequence_steps_sequence_step_id_fkey" FOREIGN KEY ("sequence_step_id") REFERENCES "public"."sequence_steps"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cases_subquestions"
    ADD CONSTRAINT "cases_subquestions_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chapters"
    ADD CONSTRAINT "chapters_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id");



ALTER TABLE ONLY "public"."courses"
    ADD CONSTRAINT "courses_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id");



ALTER TABLE ONLY "public"."daily_streaks"
    ADD CONSTRAINT "daily_streaks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."dispute_answers"
    ADD CONSTRAINT "dispute_answers_dispute_question_id_fkey" FOREIGN KEY ("dispute_question_id") REFERENCES "public"."dispute_questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."dispute_answers"
    ADD CONSTRAINT "dispute_answers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."dispute_arguments"
    ADD CONSTRAINT "dispute_arguments_dispute_view_id_fkey" FOREIGN KEY ("dispute_view_id") REFERENCES "public"."dispute_views"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."dispute_cases"
    ADD CONSTRAINT "dispute_cases_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."dispute_preferences"
    ADD CONSTRAINT "dispute_preferences_dispute_case_id_fkey" FOREIGN KEY ("dispute_case_id") REFERENCES "public"."dispute_cases"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."dispute_preferences"
    ADD CONSTRAINT "dispute_preferences_view_id_fkey" FOREIGN KEY ("view_id") REFERENCES "public"."dispute_views"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."dispute_questions"
    ADD CONSTRAINT "dispute_questions_dispute_case_id_fkey" FOREIGN KEY ("dispute_case_id") REFERENCES "public"."dispute_cases"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."dispute_views"
    ADD CONSTRAINT "dispute_views_dispute_case_id_fkey" FOREIGN KEY ("dispute_case_id") REFERENCES "public"."dispute_cases"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."dragdrop_groups"
    ADD CONSTRAINT "dragdrop_groups_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id");



ALTER TABLE ONLY "public"."dragdrop_pairs"
    ADD CONSTRAINT "dragdrop_pairs_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."dragdrop_groups"("id");



ALTER TABLE ONLY "public"."questions"
    ADD CONSTRAINT "fk_question_type" FOREIGN KEY ("question_type_id") REFERENCES "public"."question_types"("id_uuid");



ALTER TABLE ONLY "public"."item_usage_log"
    ADD CONSTRAINT "item_usage_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."league_positions"
    ADD CONSTRAINT "league_positions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."match_participants"
    ADD CONSTRAINT "match_participants_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "public"."pvp_matches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."match_participants"
    ADD CONSTRAINT "match_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."monthly_uni_scores"
    ADD CONSTRAINT "monthly_uni_scores_university_fk" FOREIGN KEY ("university_id") REFERENCES "public"."universities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."multiple_choice_options"
    ADD CONSTRAINT "multiple_choice_options_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pvp_answers"
    ADD CONSTRAINT "pvp_answers_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "public"."pvp_matches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pvp_answers"
    ADD CONSTRAINT "pvp_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pvp_answers"
    ADD CONSTRAINT "pvp_answers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pvp_participants"
    ADD CONSTRAINT "pvp_participants_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "public"."pvp_matches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pvp_participants"
    ADD CONSTRAINT "pvp_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pvp_responses"
    ADD CONSTRAINT "pvp_responses_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "public"."pvp_matches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pvp_responses"
    ADD CONSTRAINT "pvp_responses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."question_reports"
    ADD CONSTRAINT "question_reports_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id");



ALTER TABLE ONLY "public"."question_reports"
    ADD CONSTRAINT "question_reports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."questions"
    ADD CONSTRAINT "questions_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id");



ALTER TABLE ONLY "public"."questions"
    ADD CONSTRAINT "questions_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id");



ALTER TABLE ONLY "public"."quiz_progress"
    ADD CONSTRAINT "quiz_progress_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id");



ALTER TABLE ONLY "public"."quiz_progress"
    ADD CONSTRAINT "quiz_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."reward_types"
    ADD CONSTRAINT "reward_types_question_type_fkey" FOREIGN KEY ("question_type") REFERENCES "public"."question_types"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sequence_blocks"
    ADD CONSTRAINT "sequence_blocks_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."sequence_blocks"
    ADD CONSTRAINT "sequence_blocks_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sequence_steps"
    ADD CONSTRAINT "sequence_steps_block_id_fkey" FOREIGN KEY ("block_id") REFERENCES "public"."sequence_blocks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_avatars"
    ADD CONSTRAINT "user_avatars_avatar_id_fkey" FOREIGN KEY ("avatar_id") REFERENCES "public"."shop_avatars"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_avatars"
    ADD CONSTRAINT "user_avatars_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_items"
    ADD CONSTRAINT "user_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."user_medals"
    ADD CONSTRAINT "user_medals_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id");



ALTER TABLE ONLY "public"."user_medals"
    ADD CONSTRAINT "user_medals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Arguments are viewable by everyone" ON "public"."dispute_arguments" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."dispute_views" "v"
     JOIN "public"."dispute_cases" "c" ON (("v"."dispute_case_id" = "c"."id")))
  WHERE (("v"."id" = "dispute_arguments"."dispute_view_id") AND ("c"."is_active" = true)))));



CREATE POLICY "Case sequence steps are viewable by everyone" ON "public"."case_sequence_steps" FOR SELECT USING (true);



CREATE POLICY "Dispute cases are viewable by everyone" ON "public"."dispute_cases" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Enable delete for users based on user_id" ON "public"."profiles" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "id"));



CREATE POLICY "Enable insert for authenticated users only" ON "public"."answered_questions" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Enable insert for authenticated users only" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Enable insert for authenticated users only" ON "public"."user_stats" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Enable read access for all users" ON "public"."answered_questions" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Enable read access for all users" ON "public"."cases_subquestions" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."chapters" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."courses" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."dragdrop_groups" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."dragdrop_pairs" FOR SELECT TO "authenticated" USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Enable read access for all users" ON "public"."leagues" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."multiple_choice_options" FOR SELECT TO "authenticated" USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Enable read access for all users" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "id"));



CREATE POLICY "Enable read access for all users" ON "public"."questions" FOR SELECT TO "authenticated" USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Enable read access for all users" ON "public"."subjects" FOR SELECT TO "authenticated" USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Enable read access for all users" ON "public"."user_stats" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Enable update for users based on email" ON "public"."answered_questions" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Enable update for users based on email" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Enable update for users based on email" ON "public"."user_stats" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "For all authenticated" ON "public"."levels" FOR SELECT TO "authenticated" USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Only admins can insert dispute cases" ON "public"."dispute_cases" FOR INSERT WITH CHECK ((("auth"."role"() = 'authenticated'::"text") AND ("auth"."uid"() IN ( SELECT "user_roles"."user_id"
   FROM "public"."user_roles"
  WHERE ("user_roles"."role" = 'admin'::"text")))));



CREATE POLICY "Only admins can manage arguments" ON "public"."dispute_arguments" USING ((("auth"."role"() = 'authenticated'::"text") AND ("auth"."uid"() IN ( SELECT "user_roles"."user_id"
   FROM "public"."user_roles"
  WHERE ("user_roles"."role" = 'admin'::"text")))));



CREATE POLICY "Only admins can manage case sequence steps" ON "public"."case_sequence_steps" USING ((("auth"."role"() = 'authenticated'::"text") AND ("auth"."uid"() IN ( SELECT "user_roles"."user_id"
   FROM "public"."user_roles"
  WHERE ("user_roles"."role" = 'admin'::"text")))));



CREATE POLICY "Only admins can manage questions" ON "public"."dispute_questions" USING ((("auth"."role"() = 'authenticated'::"text") AND ("auth"."uid"() IN ( SELECT "user_roles"."user_id"
   FROM "public"."user_roles"
  WHERE ("user_roles"."role" = 'admin'::"text")))));



CREATE POLICY "Only admins can manage reward types" ON "public"."reward_types" USING ((("auth"."role"() = 'authenticated'::"text") AND ("auth"."uid"() IN ( SELECT "user_roles"."user_id"
   FROM "public"."user_roles"
  WHERE ("user_roles"."role" = 'admin'::"text")))));



CREATE POLICY "Only admins can manage roles" ON "public"."user_roles" USING ((("auth"."role"() = 'authenticated'::"text") AND ("auth"."uid"() IN ( SELECT "user_roles_1"."user_id"
   FROM "public"."user_roles" "user_roles_1"
  WHERE ("user_roles_1"."role" = 'admin'::"text")))));



CREATE POLICY "Only admins can manage sequence steps" ON "public"."sequence_steps" USING ((("auth"."role"() = 'authenticated'::"text") AND ("auth"."uid"() IN ( SELECT "user_roles"."user_id"
   FROM "public"."user_roles"
  WHERE ("user_roles"."role" = 'admin'::"text")))));



CREATE POLICY "Only admins can manage views" ON "public"."dispute_views" USING ((("auth"."role"() = 'authenticated'::"text") AND ("auth"."uid"() IN ( SELECT "user_roles"."user_id"
   FROM "public"."user_roles"
  WHERE ("user_roles"."role" = 'admin'::"text")))));



CREATE POLICY "Only admins can update dispute cases" ON "public"."dispute_cases" FOR UPDATE USING ((("auth"."role"() = 'authenticated'::"text") AND ("auth"."uid"() IN ( SELECT "user_roles"."user_id"
   FROM "public"."user_roles"
  WHERE ("user_roles"."role" = 'admin'::"text")))));



CREATE POLICY "Only service role can insert/update/delete" ON "public"."items" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Only system can insert rewards" ON "public"."answered_rewards" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Public read access to items" ON "public"."items" FOR SELECT USING (true);



CREATE POLICY "Public read access to league_positions" ON "public"."league_positions" FOR SELECT USING (true);



CREATE POLICY "Public read access to shop_avatars" ON "public"."shop_avatars" FOR SELECT USING (true);



CREATE POLICY "Public read access to universities" ON "public"."universities" FOR SELECT USING (true);



CREATE POLICY "Questions are viewable by everyone" ON "public"."dispute_questions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."dispute_cases"
  WHERE (("dispute_cases"."id" = "dispute_questions"."dispute_case_id") AND ("dispute_cases"."is_active" = true)))));



CREATE POLICY "Reward types are viewable by everyone" ON "public"."reward_types" FOR SELECT USING (true);



CREATE POLICY "Sequence steps are viewable by everyone" ON "public"."sequence_steps" FOR SELECT USING (true);



CREATE POLICY "User can delete their own avatars" ON "public"."user_avatars" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "User can insert their own avatars" ON "public"."user_avatars" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "User can update own league_position" ON "public"."league_positions" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "User can update own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "User can update their own avatars" ON "public"."user_avatars" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "User can view their own avatars" ON "public"."user_avatars" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own answers" ON "public"."dispute_answers" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage their own preferences" ON "public"."dispute_preferences" USING (("auth"."uid"() IN ( SELECT "dispute_answers"."user_id"
   FROM "public"."dispute_answers"
  WHERE ("dispute_answers"."dispute_question_id" IN ( SELECT "dispute_questions"."id"
           FROM "public"."dispute_questions"
          WHERE ("dispute_questions"."dispute_case_id" = "dispute_preferences"."dispute_case_id"))))));



CREATE POLICY "Users can read all profiles (e.g. for Leaderboard)" ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "Users can update their own answers" ON "public"."dispute_answers" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own answers" ON "public"."dispute_answers" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own preferences" ON "public"."dispute_preferences" FOR SELECT USING (("auth"."uid"() IN ( SELECT "dispute_answers"."user_id"
   FROM "public"."dispute_answers"
  WHERE ("dispute_answers"."dispute_question_id" IN ( SELECT "dispute_questions"."id"
           FROM "public"."dispute_questions"
          WHERE ("dispute_questions"."dispute_case_id" = "dispute_preferences"."dispute_case_id"))))));



CREATE POLICY "Users can view their own rewards" ON "public"."answered_rewards" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own roles" ON "public"."user_roles" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Views are viewable by everyone" ON "public"."dispute_views" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."dispute_cases"
  WHERE (("dispute_cases"."id" = "dispute_views"."dispute_case_id") AND ("dispute_cases"."is_active" = true)))));



ALTER TABLE "public"."answered_questions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."answered_rewards" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."case_sequence_steps" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cases_subquestions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."chapters" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."courses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."daily_streaks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."dispute_answers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."dispute_arguments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."dispute_cases" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."dispute_preferences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."dispute_questions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."dispute_views" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."dragdrop_groups" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."dragdrop_pairs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "insert_own_daily_streak" ON "public"."daily_streaks" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "insert_own_medals" ON "public"."user_medals" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "insert_own_pvp_answers" ON "public"."pvp_answers" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."league_positions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."leagues" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."levels" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."match_participants" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."multiple_choice_options" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "own_participation" ON "public"."pvp_participants" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "own_responses" ON "public"."pvp_responses" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."pvp_answers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pvp_matches" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pvp_participants" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pvp_responses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."questions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reward_types" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "see_own_matches" ON "public"."pvp_matches" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."match_participants" "mp"
  WHERE (("mp"."match_id" = "pvp_matches"."id") AND ("mp"."user_id" = "auth"."uid"())))));



CREATE POLICY "see_own_participation" ON "public"."match_participants" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "see_own_pvp_answers" ON "public"."pvp_answers" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "select_own_answers" ON "public"."answered_questions" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "select_own_daily_streak" ON "public"."daily_streaks" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "select_own_items" ON "public"."user_items" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "select_own_medals" ON "public"."user_medals" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."sequence_steps" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."shop_avatars" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subjects" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."universities" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "update_own_daily_streak" ON "public"."daily_streaks" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "update_own_items" ON "public"."user_items" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."user_avatars" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_medals" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_roles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_stats" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."award_medal_if_eligible"("p_user_id" "uuid", "p_chapter_id" bigint, "p_progress" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."award_medal_if_eligible"("p_user_id" "uuid", "p_chapter_id" bigint, "p_progress" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."award_medal_if_eligible"("p_user_id" "uuid", "p_chapter_id" bigint, "p_progress" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."check_and_reward_answer"("p_user_id" "uuid", "p_context_id" "uuid", "p_question_type" "text", "p_is_correct" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."check_and_reward_answer"("p_user_id" "uuid", "p_context_id" "uuid", "p_question_type" "text", "p_is_correct" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_and_reward_answer"("p_user_id" "uuid", "p_context_id" "uuid", "p_question_type" "text", "p_is_correct" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_end_screen_details"("p_user_id" "uuid", "p_chapter_id" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."get_end_screen_details"("p_user_id" "uuid", "p_chapter_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_end_screen_details"("p_user_id" "uuid", "p_chapter_id" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_end_screen_summary"("p_user_id" "uuid", "p_chapter_id" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."get_end_screen_summary"("p_user_id" "uuid", "p_chapter_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_end_screen_summary"("p_user_id" "uuid", "p_chapter_id" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_global_leaderboard"("p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_global_leaderboard"("p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_global_leaderboard"("p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_incorrect_questions"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_incorrect_questions"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_incorrect_questions"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_league_leaderboard"("p_league_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_league_leaderboard"("p_league_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_league_leaderboard"("p_league_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_level_info"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_level_info"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_level_info"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_medal_candidate_with_status"("p_user_id" "uuid", "p_chapter_id" bigint, "p_progress" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_medal_candidate_with_status"("p_user_id" "uuid", "p_chapter_id" bigint, "p_progress" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_medal_candidate_with_status"("p_user_id" "uuid", "p_chapter_id" bigint, "p_progress" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_question_detail"("p_question_id" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."get_question_detail"("p_question_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_question_detail"("p_question_id" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_questions_by_chapter"("p_chapter_id" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."get_questions_by_chapter"("p_chapter_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_questions_by_chapter"("p_chapter_id" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_quiz_progress"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_quiz_progress"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_quiz_progress"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_reward_status"("p_user_id" "uuid", "p_context_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_reward_status"("p_user_id" "uuid", "p_context_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_reward_status"("p_user_id" "uuid", "p_context_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_shop_items"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_shop_items"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_shop_items"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_streak_status"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_streak_status"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_streak_status"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_university_contributors"("p_university_id" bigint, "p_month" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_university_contributors"("p_university_id" bigint, "p_month" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_university_contributors"("p_university_id" bigint, "p_month" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_university_ranking"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_university_ranking"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_university_ranking"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_items"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_items"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_items"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_profile"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_profile"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_profile"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."level_up_if_eligible"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."level_up_if_eligible"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."level_up_if_eligible"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."purchase_item"("p_user_id" "uuid", "p_item_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."purchase_item"("p_user_id" "uuid", "p_item_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."purchase_item"("p_user_id" "uuid", "p_item_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."report_question"("p_user_id" "uuid", "p_question_id" bigint, "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."report_question"("p_user_id" "uuid", "p_question_id" bigint, "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."report_question"("p_user_id" "uuid", "p_question_id" bigint, "p_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."reset_leagues"() TO "anon";
GRANT ALL ON FUNCTION "public"."reset_leagues"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."reset_leagues"() TO "service_role";



GRANT ALL ON FUNCTION "public"."resolve_question_report"("p_report_id" bigint, "p_status" "text", "p_notes" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."resolve_question_report"("p_report_id" bigint, "p_status" "text", "p_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."resolve_question_report"("p_report_id" bigint, "p_status" "text", "p_notes" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."submit_answer"("p_user_id" "uuid", "p_question_id" bigint, "p_answer_data" "jsonb", "p_used_items" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."submit_answer"("p_user_id" "uuid", "p_question_id" bigint, "p_answer_data" "jsonb", "p_used_items" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."submit_answer"("p_user_id" "uuid", "p_question_id" bigint, "p_answer_data" "jsonb", "p_used_items" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_avatar"("p_user_id" "uuid", "p_avatar_id" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."update_avatar"("p_user_id" "uuid", "p_avatar_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_avatar"("p_user_id" "uuid", "p_avatar_id" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_daily_streak"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."update_daily_streak"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_daily_streak"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."use_item"("p_user_id" "uuid", "p_item_id" "uuid", "p_metadata" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."use_item"("p_user_id" "uuid", "p_item_id" "uuid", "p_metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."use_item"("p_user_id" "uuid", "p_item_id" "uuid", "p_metadata" "jsonb") TO "service_role";



GRANT ALL ON TABLE "public"."answered_questions" TO "anon";
GRANT ALL ON TABLE "public"."answered_questions" TO "authenticated";
GRANT ALL ON TABLE "public"."answered_questions" TO "service_role";



GRANT ALL ON SEQUENCE "public"."answered_questions_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."answered_questions_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."answered_questions_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."answered_rewards" TO "anon";
GRANT ALL ON TABLE "public"."answered_rewards" TO "authenticated";
GRANT ALL ON TABLE "public"."answered_rewards" TO "service_role";



GRANT ALL ON TABLE "public"."case_sequence_steps" TO "anon";
GRANT ALL ON TABLE "public"."case_sequence_steps" TO "authenticated";
GRANT ALL ON TABLE "public"."case_sequence_steps" TO "service_role";



GRANT ALL ON TABLE "public"."cases_subquestions" TO "anon";
GRANT ALL ON TABLE "public"."cases_subquestions" TO "authenticated";
GRANT ALL ON TABLE "public"."cases_subquestions" TO "service_role";



GRANT ALL ON SEQUENCE "public"."cases_subquestions_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."cases_subquestions_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."cases_subquestions_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."questions" TO "anon";
GRANT ALL ON TABLE "public"."questions" TO "authenticated";
GRANT ALL ON TABLE "public"."questions" TO "service_role";



GRANT ALL ON TABLE "public"."chapter_stats" TO "anon";
GRANT ALL ON TABLE "public"."chapter_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."chapter_stats" TO "service_role";



GRANT ALL ON TABLE "public"."chapters" TO "anon";
GRANT ALL ON TABLE "public"."chapters" TO "authenticated";
GRANT ALL ON TABLE "public"."chapters" TO "service_role";



GRANT ALL ON SEQUENCE "public"."chapters_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."chapters_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."chapters_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."courses" TO "anon";
GRANT ALL ON TABLE "public"."courses" TO "authenticated";
GRANT ALL ON TABLE "public"."courses" TO "service_role";



GRANT ALL ON SEQUENCE "public"."courses_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."courses_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."courses_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."user_stats" TO "anon";
GRANT ALL ON TABLE "public"."user_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."user_stats" TO "service_role";



GRANT ALL ON TABLE "public"."ranked_players" TO "anon";
GRANT ALL ON TABLE "public"."ranked_players" TO "authenticated";
GRANT ALL ON TABLE "public"."ranked_players" TO "service_role";



GRANT ALL ON TABLE "public"."current_league_positions" TO "anon";
GRANT ALL ON TABLE "public"."current_league_positions" TO "authenticated";
GRANT ALL ON TABLE "public"."current_league_positions" TO "service_role";



GRANT ALL ON TABLE "public"."daily_streaks" TO "anon";
GRANT ALL ON TABLE "public"."daily_streaks" TO "authenticated";
GRANT ALL ON TABLE "public"."daily_streaks" TO "service_role";



GRANT ALL ON TABLE "public"."dispute_answers" TO "anon";
GRANT ALL ON TABLE "public"."dispute_answers" TO "authenticated";
GRANT ALL ON TABLE "public"."dispute_answers" TO "service_role";



GRANT ALL ON TABLE "public"."dispute_arguments" TO "anon";
GRANT ALL ON TABLE "public"."dispute_arguments" TO "authenticated";
GRANT ALL ON TABLE "public"."dispute_arguments" TO "service_role";



GRANT ALL ON TABLE "public"."dispute_cases" TO "anon";
GRANT ALL ON TABLE "public"."dispute_cases" TO "authenticated";
GRANT ALL ON TABLE "public"."dispute_cases" TO "service_role";



GRANT ALL ON TABLE "public"."dispute_preferences" TO "anon";
GRANT ALL ON TABLE "public"."dispute_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."dispute_preferences" TO "service_role";



GRANT ALL ON TABLE "public"."dispute_questions" TO "anon";
GRANT ALL ON TABLE "public"."dispute_questions" TO "authenticated";
GRANT ALL ON TABLE "public"."dispute_questions" TO "service_role";



GRANT ALL ON TABLE "public"."dispute_views" TO "anon";
GRANT ALL ON TABLE "public"."dispute_views" TO "authenticated";
GRANT ALL ON TABLE "public"."dispute_views" TO "service_role";



GRANT ALL ON TABLE "public"."dragdrop_groups" TO "anon";
GRANT ALL ON TABLE "public"."dragdrop_groups" TO "authenticated";
GRANT ALL ON TABLE "public"."dragdrop_groups" TO "service_role";



GRANT ALL ON SEQUENCE "public"."dragdrop_groups_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."dragdrop_groups_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."dragdrop_groups_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."dragdrop_pairs" TO "anon";
GRANT ALL ON TABLE "public"."dragdrop_pairs" TO "authenticated";
GRANT ALL ON TABLE "public"."dragdrop_pairs" TO "service_role";



GRANT ALL ON SEQUENCE "public"."dragdrop_pairs_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."dragdrop_pairs_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."dragdrop_pairs_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."item_usage_log" TO "anon";
GRANT ALL ON TABLE "public"."item_usage_log" TO "authenticated";
GRANT ALL ON TABLE "public"."item_usage_log" TO "service_role";



GRANT ALL ON SEQUENCE "public"."item_usage_log_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."item_usage_log_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."item_usage_log_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."items" TO "anon";
GRANT ALL ON TABLE "public"."items" TO "authenticated";
GRANT ALL ON TABLE "public"."items" TO "service_role";



GRANT ALL ON TABLE "public"."league_positions" TO "anon";
GRANT ALL ON TABLE "public"."league_positions" TO "authenticated";
GRANT ALL ON TABLE "public"."league_positions" TO "service_role";



GRANT ALL ON TABLE "public"."leagues" TO "anon";
GRANT ALL ON TABLE "public"."leagues" TO "authenticated";
GRANT ALL ON TABLE "public"."leagues" TO "service_role";



GRANT ALL ON SEQUENCE "public"."leagues_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."leagues_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."leagues_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."levels" TO "anon";
GRANT ALL ON TABLE "public"."levels" TO "authenticated";
GRANT ALL ON TABLE "public"."levels" TO "service_role";



GRANT ALL ON SEQUENCE "public"."levels_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."levels_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."levels_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."match_participants" TO "anon";
GRANT ALL ON TABLE "public"."match_participants" TO "authenticated";
GRANT ALL ON TABLE "public"."match_participants" TO "service_role";



GRANT ALL ON TABLE "public"."medals" TO "anon";
GRANT ALL ON TABLE "public"."medals" TO "authenticated";
GRANT ALL ON TABLE "public"."medals" TO "service_role";



GRANT ALL ON TABLE "public"."monthly_uni_scores" TO "anon";
GRANT ALL ON TABLE "public"."monthly_uni_scores" TO "authenticated";
GRANT ALL ON TABLE "public"."monthly_uni_scores" TO "service_role";



GRANT ALL ON SEQUENCE "public"."monthly_uni_scores_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."monthly_uni_scores_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."monthly_uni_scores_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."multiple_choice_options" TO "anon";
GRANT ALL ON TABLE "public"."multiple_choice_options" TO "authenticated";
GRANT ALL ON TABLE "public"."multiple_choice_options" TO "service_role";



GRANT ALL ON SEQUENCE "public"."multiple_choice_options_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."multiple_choice_options_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."multiple_choice_options_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."pvp_answers" TO "anon";
GRANT ALL ON TABLE "public"."pvp_answers" TO "authenticated";
GRANT ALL ON TABLE "public"."pvp_answers" TO "service_role";



GRANT ALL ON TABLE "public"."pvp_matches" TO "anon";
GRANT ALL ON TABLE "public"."pvp_matches" TO "authenticated";
GRANT ALL ON TABLE "public"."pvp_matches" TO "service_role";



GRANT ALL ON TABLE "public"."pvp_participants" TO "anon";
GRANT ALL ON TABLE "public"."pvp_participants" TO "authenticated";
GRANT ALL ON TABLE "public"."pvp_participants" TO "service_role";



GRANT ALL ON TABLE "public"."pvp_responses" TO "anon";
GRANT ALL ON TABLE "public"."pvp_responses" TO "authenticated";
GRANT ALL ON TABLE "public"."pvp_responses" TO "service_role";



GRANT ALL ON TABLE "public"."question_reports" TO "anon";
GRANT ALL ON TABLE "public"."question_reports" TO "authenticated";
GRANT ALL ON TABLE "public"."question_reports" TO "service_role";



GRANT ALL ON SEQUENCE "public"."question_reports_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."question_reports_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."question_reports_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."question_types" TO "anon";
GRANT ALL ON TABLE "public"."question_types" TO "authenticated";
GRANT ALL ON TABLE "public"."question_types" TO "service_role";



GRANT ALL ON SEQUENCE "public"."questions_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."questions_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."questions_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."quiz_progress" TO "anon";
GRANT ALL ON TABLE "public"."quiz_progress" TO "authenticated";
GRANT ALL ON TABLE "public"."quiz_progress" TO "service_role";



GRANT ALL ON SEQUENCE "public"."quiz_progress_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."quiz_progress_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."quiz_progress_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."reward_types" TO "anon";
GRANT ALL ON TABLE "public"."reward_types" TO "authenticated";
GRANT ALL ON TABLE "public"."reward_types" TO "service_role";



GRANT ALL ON TABLE "public"."sequence_blocks" TO "anon";
GRANT ALL ON TABLE "public"."sequence_blocks" TO "authenticated";
GRANT ALL ON TABLE "public"."sequence_blocks" TO "service_role";



GRANT ALL ON TABLE "public"."sequence_steps" TO "anon";
GRANT ALL ON TABLE "public"."sequence_steps" TO "authenticated";
GRANT ALL ON TABLE "public"."sequence_steps" TO "service_role";



GRANT ALL ON TABLE "public"."shop_avatars" TO "anon";
GRANT ALL ON TABLE "public"."shop_avatars" TO "authenticated";
GRANT ALL ON TABLE "public"."shop_avatars" TO "service_role";



GRANT ALL ON SEQUENCE "public"."shop_avatars_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."shop_avatars_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."shop_avatars_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."subjects" TO "anon";
GRANT ALL ON TABLE "public"."subjects" TO "authenticated";
GRANT ALL ON TABLE "public"."subjects" TO "service_role";



GRANT ALL ON SEQUENCE "public"."subjects_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."subjects_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."subjects_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."universities" TO "anon";
GRANT ALL ON TABLE "public"."universities" TO "authenticated";
GRANT ALL ON TABLE "public"."universities" TO "service_role";



GRANT ALL ON SEQUENCE "public"."universities_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."universities_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."universities_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."user_avatars" TO "anon";
GRANT ALL ON TABLE "public"."user_avatars" TO "authenticated";
GRANT ALL ON TABLE "public"."user_avatars" TO "service_role";



GRANT ALL ON TABLE "public"."user_items" TO "anon";
GRANT ALL ON TABLE "public"."user_items" TO "authenticated";
GRANT ALL ON TABLE "public"."user_items" TO "service_role";



GRANT ALL ON TABLE "public"."user_medals" TO "anon";
GRANT ALL ON TABLE "public"."user_medals" TO "authenticated";
GRANT ALL ON TABLE "public"."user_medals" TO "service_role";



GRANT ALL ON TABLE "public"."user_roles" TO "anon";
GRANT ALL ON TABLE "public"."user_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_roles" TO "service_role";



GRANT ALL ON TABLE "public"."versions" TO "anon";
GRANT ALL ON TABLE "public"."versions" TO "authenticated";
GRANT ALL ON TABLE "public"."versions" TO "service_role";



GRANT ALL ON SEQUENCE "public"."versions_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."versions_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."versions_id_seq" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






RESET ALL;
