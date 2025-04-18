-- File: reset_uni_leaderboard.sql
-- Funktion zum Zurücksetzen des Universitäts-Leaderboards
-- Beschreibung: Erstellt einen neuen monatlichen Eintrag für jede Universität
--              und setzt die XP für den neuen Monat auf 0
-- Parameter: keine
-- Rückgabewert: void (keine Rückgabe)

DROP FUNCTION IF EXISTS public.reset_uni_leaderboard();

CREATE OR REPLACE FUNCTION public.reset_uni_leaderboard()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    current_month_start DATE;
    current_month_end DATE;
BEGIN
    -- Aktuellen Monat bestimmen
    current_month_start := DATE_TRUNC('month', CURRENT_DATE);
    current_month_end := (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day')::DATE;

    -- Neue Einträge für alle Universitäten erstellen
    INSERT INTO monthly_uni_scores (
        university_id,
        xp_this_month,
        month_start,
        month_end
    )
    SELECT 
        id as university_id,
        0 as xp_this_month,
        current_month_start as month_start,
        current_month_end as month_end
    FROM universities
    WHERE name IS NOT NULL
    ON CONFLICT (university_id, month_start) DO UPDATE
    SET xp_this_month = 0;

    -- Gesamte XP in universities Tabelle aktualisieren
    UPDATE universities u
    SET xp_total = COALESCE(
        (SELECT SUM(xp_this_month)
         FROM monthly_uni_scores
         WHERE university_id = u.id),
        0
    );
END;
$$;
