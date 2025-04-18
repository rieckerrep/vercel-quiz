-- File: get_end_screen_summary.sql
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
