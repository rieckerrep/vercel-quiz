-- File: get_medal_candidate_with_status.sql
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
