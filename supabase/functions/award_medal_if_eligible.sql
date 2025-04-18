-- File: award_medal_if_eligible.sql
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


