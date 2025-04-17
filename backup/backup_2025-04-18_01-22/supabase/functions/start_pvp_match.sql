-- File: start_pvp_match.sql
DROP FUNCTION IF EXISTS start_pvp_match(
    p_user_id UUID,
    p_opponent_id UUID
);

CREATE OR REPLACE FUNCTION "public"."start_pvp_match"("p_user_id" uuid, "p_opponent_id" uuid) RETURNS uuid
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  new_match_id UUID;
BEGIN
  -- Match anlegen
  INSERT INTO pvp_matches (status)
  VALUES ('pending')
  RETURNING id INTO new_match_id;

  -- Beide Teilnehmer eintragen
  INSERT INTO match_participants (match_id, user_id)
  VALUES (new_match_id, p_user_id),
         (new_match_id, p_opponent_id);

  -- Match-ID zurückgeben
  RETURN new_match_id;
END;
$$;
