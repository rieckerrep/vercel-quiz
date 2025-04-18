-- File: reset_leagues.sql
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
