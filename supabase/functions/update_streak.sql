-- File: update_streak.sql
CREATE OR REPLACE FUNCTION "public"."update_streak"("user_id" "uuid", "is_correct" boolean) RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  streak_value INTEGER;
BEGIN
  -- Sicherstellen, dass Streak-Eintrag existiert
  INSERT INTO user_streaks (user_id, current_streak)
  VALUES (user_id, 0)
  ON CONFLICT (user_id) DO NOTHING;

  IF is_correct THEN
    -- Streak erhöhen
    UPDATE user_streaks
    SET current_streak = current_streak + 1,
        last_updated = NOW()
    WHERE user_id = user_id;

    -- Prüfen, ob Streak 3 erreicht wurde
    SELECT current_streak INTO streak_value
    FROM user_streaks
    WHERE user_id = user_id;

    IF streak_value >= 3 THEN
      -- Bonus-XP vergeben
      UPDATE user_stats
      SET xp = xp + 30
      WHERE user_id = user_id;

      -- Streak zurücksetzen
      UPDATE user_streaks
      SET current_streak = 0
      WHERE user_id = user_id;

      RETURN '✅ Streak-Bonus vergeben';
    ELSE
      RETURN '✅ Streak erhöht auf ' || streak_value;
    END IF;

  ELSE
    -- Streak zurücksetzen bei falscher Antwort
    UPDATE user_streaks
    SET current_streak = 0,
        last_updated = NOW()
    WHERE user_id = user_id;

    RETURN '🚫 Streak zurückgesetzt';
  END IF;
END;
$$;
