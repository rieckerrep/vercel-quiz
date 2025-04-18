-- Migration: Standardisierung der handle_new_user Funktion
-- Beschreibung: Verbesserung der Dokumentation, Formatierung und Fehlerbehandlung

-- Funktion zum Erstellen eines neuen Benutzerprofils
-- Beschreibung: Trigger-Funktion, die automatisch ein neues Profil erstellt,
--              wenn ein neuer Benutzer registriert wird
-- Parameter: Trigger-Parameter (NEW enthält den neuen Benutzer)
-- Rückgabewert: Der neue Benutzer (Trigger-Rückgabewert)

DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Erstelle neues Profil
    INSERT INTO public.profiles (
        id,
        created_at
    ) VALUES (
        NEW.id,
        CURRENT_TIMESTAMP
    );

    -- Erstelle Statistik-Eintrag
    INSERT INTO public.user_stats (
        user_id,
        total_xp,
        total_coins,
        current_league,
        created_at
    ) VALUES (
        NEW.id,
        0,
        0,
        'Holzliga',
        CURRENT_TIMESTAMP
    );

    -- Erstelle Streak-Einträge
    INSERT INTO public.user_streaks (
        user_id,
        current_streak,
        last_updated
    ) VALUES (
        NEW.id,
        0,
        CURRENT_TIMESTAMP
    );

    INSERT INTO public.daily_streaks (
        user_id,
        current_streak,
        last_active_date
    ) VALUES (
        NEW.id,
        0,
        CURRENT_DATE
    );

    RETURN NEW;
END;
$$; 