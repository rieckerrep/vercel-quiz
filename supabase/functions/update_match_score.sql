-- File: update_match_score.sql
CREATE OR REPLACE FUNCTION "public"."update_match_score"("match_id" "uuid", "user_id" "uuid", "is_correct" boolean) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Punktestand für den Spieler aktualisieren
  UPDATE match_participants
  SET score = score + CASE WHEN is_correct THEN 10 ELSE 0 END
  WHERE match_id = match_id AND user_id = user_id;
END;
$$;
