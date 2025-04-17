-- File: finalize_pvp_match.sql
DROP FUNCTION IF EXISTS finalize_pvp_match(
    p_match_id UUID
);

CREATE OR REPLACE FUNCTION "public"."finalize_pvp_match"("match_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  p1 UUID;
  p2 UUID;
  p1_hp INTEGER;
  p2_hp INTEGER;
  winner UUID;
  loser UUID;
BEGIN
  -- Teilnehmer ermitteln
  SELECT user_id INTO p1 FROM pvp_participants WHERE match_id = match_id LIMIT 1;
  SELECT user_id INTO p2 FROM pvp_participants WHERE match_id = match_id AND user_id != p1;

  -- HP beider Spieler
  SELECT hp INTO p1_hp FROM pvp_participants WHERE match_id = match_id AND user_id = p1;
  SELECT hp INTO p2_hp FROM pvp_participants WHERE match_id = match_id AND user_id = p2;

  -- Prüfen, ob Match schon beendet
  IF EXISTS (
    SELECT 1 FROM pvp_matches WHERE id = match_id AND status = 'finished'
  ) THEN
    RETURN '🚫 Match wurde bereits abgeschlossen';
  END IF;

  -- Sieger bestimmen
  IF p1_hp > p2_hp THEN
    winner := p1;
    loser := p2;
  ELSIF p2_hp > p1_hp THEN
    winner := p2;
    loser := p1;
  ELSE
    winner := NULL; -- Unentschieden
  END IF;

  -- Matchstatus aktualisieren
  UPDATE pvp_matches SET status = 'finished' WHERE id = match_id;

  -- XP/Coins vergeben
  IF winner IS NOT NULL THEN
    -- Gewinner
    UPDATE user_stats SET xp = xp + 50, coins = coins + 50 WHERE user_id = winner;
    -- Verlierer
    UPDATE user_stats SET xp = xp + 20, coins = coins + 20 WHERE user_id = loser;
  ELSE
    -- Unentschieden
    UPDATE user_stats SET xp = xp + 30, coins = coins + 30
    WHERE user_id IN (p1, p2);
  END IF;

  RETURN '✅ Match abgeschlossen';
END;
$$;
