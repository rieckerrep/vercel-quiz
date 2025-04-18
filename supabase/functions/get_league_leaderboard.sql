-- File: get_league_leaderboard.sql
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
