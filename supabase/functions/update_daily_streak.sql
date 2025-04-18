-- File: update_daily_streak.sql
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


