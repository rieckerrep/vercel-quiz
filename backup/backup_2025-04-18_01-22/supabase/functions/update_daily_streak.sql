-- File: update_daily_streak.sql
CREATE OR REPLACE FUNCTION "public"."update_daily_streak"("user_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  berlin_today DATE := timezone('Europe/Berlin', now())::DATE;
  yesterday DATE := berlin_today - INTERVAL '1 day';
  last_date DATE;
BEGIN
  -- Sicherstellen, dass Eintrag existiert
  INSERT INTO daily_streaks (user_id, current_streak, last_active_date)
  VALUES (user_id, 1, berlin_today)
  ON CONFLICT (user_id) DO NOTHING;

  -- Letztes Aktivitätsdatum holen
  SELECT last_active_date INTO last_date
  FROM daily_streaks
  WHERE user_id = user_id;

  IF last_date = berlin_today THEN
    RETURN '✅ Heute bereits gezählt';
  ELSIF last_date = yesterday THEN
    -- Streak +1
    UPDATE daily_streaks
    SET current_streak = current_streak + 1,
        last_active_date = berlin_today,
        last_updated = NOW()
    WHERE user_id = user_id;

    RETURN '🔥 Streak erhöht';
  ELSE
    -- Streak reset
    UPDATE daily_streaks
    SET current_streak = 1,
        last_active_date = berlin_today,
        last_updated = NOW()
    WHERE user_id = user_id;

    RETURN '❄️ Streak zurückgesetzt';
  END IF;
END;
$$;
