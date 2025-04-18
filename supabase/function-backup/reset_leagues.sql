-- File: reset_leagues.sql
-- Funktion zum Zurücksetzen und Neuberechnen der Ligen
-- Beschreibung: Befördert die Top 10 Spieler jeder Liga in die nächsthöhere
--              und stuft die untersten 5 Spieler in die niedrigere Liga ab
-- Parameter: keine
-- Rückgabewert: void (keine Rückgabe)

DROP FUNCTION IF EXISTS public.reset_leagues();

CREATE OR REPLACE FUNCTION public.reset_leagues()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    rec RECORD;
    next_league TEXT;
    prev_league TEXT;
    promotion_threshold CONSTANT INTEGER := 10;  -- Top 10 werden befördert
    demotion_threshold CONSTANT INTEGER := 5;    -- Unterste 5 werden abgestuft
BEGIN
    -- Für jede existierende Liga
    FOR rec IN
        SELECT DISTINCT current_league 
        FROM user_stats 
        WHERE current_league IS NOT NULL
        ORDER BY current_league
    LOOP
        -- Bestimme die nächsthöhere und niedrigere Liga
        CASE rec.current_league
            WHEN 'Holzliga' THEN
                next_league := 'Bronzeliga';
                prev_league := NULL;
            WHEN 'Bronzeliga' THEN
                next_league := 'Silberliga';
                prev_league := 'Holzliga';
            WHEN 'Silberliga' THEN
                next_league := 'Goldliga';
                prev_league := 'Bronzeliga';
            WHEN 'Goldliga' THEN
                next_league := 'Platinliga';
                prev_league := 'Silberliga';
            WHEN 'Platinliga' THEN
                next_league := 'Champions League';
                prev_league := 'Goldliga';
            ELSE
                next_league := NULL;
                prev_league := NULL;
        END CASE;

        -- Beförderung der Top 10
        IF next_league IS NOT NULL THEN
            WITH ranked AS (
                SELECT 
                    user_id,
                    total_xp,
                    ROW_NUMBER() OVER (
                        ORDER BY total_xp DESC
                    ) as rn
                FROM user_stats
                WHERE current_league = rec.current_league
            )
            UPDATE user_stats
            SET current_league = next_league
            FROM ranked
            WHERE user_stats.user_id = ranked.user_id
                AND ranked.rn <= promotion_threshold;
        END IF;

        -- Abstufung der untersten 5
        IF prev_league IS NOT NULL THEN
            WITH ranked AS (
                SELECT 
                    user_id,
                    total_xp,
                    ROW_NUMBER() OVER (
                        ORDER BY total_xp ASC
                    ) as rn
                FROM user_stats
                WHERE current_league = rec.current_league
            )
            UPDATE user_stats
            SET current_league = prev_league
            FROM ranked
            WHERE user_stats.user_id = ranked.user_id
                AND ranked.rn <= demotion_threshold;
        END IF;
    END LOOP;

    -- Aktualisiere die Liga-Gruppen
    PERFORM update_league_groups();
END;
$$;
