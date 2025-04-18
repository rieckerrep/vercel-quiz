-- File: update_league_groups.sql
-- Funktion zum Aktualisieren der Liga-Gruppen
-- Beschreibung: Teilt Spieler innerhalb ihrer Liga in Gruppen von je 30 Spielern ein,
--              basierend auf ihren XP-Werten
-- Parameter: keine
-- Rückgabewert: void (keine Rückgabe)

DROP FUNCTION IF EXISTS public.update_league_groups();

CREATE OR REPLACE FUNCTION public.update_league_groups()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    -- Aktualisiere Liga-Gruppen
    -- Nutze ROW_NUMBER für Ranking innerhalb jeder Liga
    -- und teile durch 30 für Gruppennummer
    WITH ranked AS (
        SELECT 
            user_id,
            current_league,
            ROW_NUMBER() OVER (
                PARTITION BY current_league 
                ORDER BY total_xp DESC
            ) AS rn
        FROM user_stats
        WHERE current_league IS NOT NULL
    )
    UPDATE user_stats us
    SET league_group = CONCAT(
        us.current_league, 
        ' Gruppe ', 
        CEIL(r.rn::numeric / 30)
    )
    FROM ranked r
    WHERE us.user_id = r.user_id;
END;
$$;
