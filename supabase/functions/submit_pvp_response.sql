-- File: submit_pvp_response.sql
DROP FUNCTION IF EXISTS submit_pvp_response(
    p_match_id UUID,
    p_user_id UUID,
    p_response TEXT
);

CREATE OR REPLACE FUNCTION "public"."submit_pvp_response"("user_id" "uuid", "match_id" "uuid", "question_id" bigint, "is_correct" boolean, "response_time_ms" integer) RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  damage_to_enemy INTEGER := 0;
  self_penalty INTEGER := 0;
  opponent_id UUID;
BEGIN
  -- Anti-Farming: Frage schon beantwortet?
  IF EXISTS (
    SELECT 1 FROM pvp_responses
    WHERE match_id = match_id AND user_id = user_id AND question_id = question_id
  ) THEN
    RETURN '🚫 Frage bereits beantwortet';
  END IF;

  -- Gegner ermitteln
  SELECT user_id INTO opponent_id
  FROM pvp_participants
  WHERE match_id = match_id AND user_id != user_id;

  -- Schadensberechnung
  IF is_correct THEN
    -- Weniger Zeit = mehr Schaden (Basis: 20 - response_time_ms / 1000 capped)
    damage_to_enemy := GREATEST(10, LEAST(20, 25 - response_time_ms / 1000));
  ELSE
    self_penalty := 10;
  END IF;

  -- Antwort speichern
  INSERT INTO pvp_responses (match_id, user_id, question_id, is_correct, damage_done, self_damage)
  VALUES (match_id, user_id, question_id, is_correct, damage_to_enemy, self_penalty);

  -- HP aktualisieren
  IF is_correct THEN
    UPDATE pvp_participants
    SET hp = hp - damage_to_enemy
    WHERE match_id = match_id AND user_id = opponent_id;
  ELSE
    UPDATE pvp_participants
    SET hp = hp - self_penalty
    WHERE match_id = match_id AND user_id = user_id;
  END IF;

  RETURN '✅ Antwort verarbeitet';
END;
$$;
