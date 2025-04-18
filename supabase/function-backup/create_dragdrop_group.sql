-- File: create_dragdrop_group.sql
-- Funktion: create_dragdrop_group
-- Beschreibung: Trigger-Funktion, die automatisch eine neue Drag & Drop Gruppe
--              erstellt, wenn eine neue Drag & Drop Frage angelegt wird
-- Parameter: Trigger-Parameter (NEW enthält die neue Frage)
-- Rückgabewert: Die neue Frage (Trigger-Rückgabewert)

DROP FUNCTION IF EXISTS public.create_dragdrop_group() CASCADE;

CREATE OR REPLACE FUNCTION public.create_dragdrop_group()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_dragdrop_type_id UUID := '9a1d8851-7059-4dd2-bf3a-b954f456262a';
    v_group_exists BOOLEAN;
BEGIN
    -- Prüfe ob es sich um eine Drag & Drop Frage handelt
    IF NEW.question_type_id = v_dragdrop_type_id THEN
        -- Prüfe ob bereits eine Gruppe existiert
        SELECT EXISTS (
            SELECT 1 FROM dragdrop_groups 
            WHERE question_id = NEW.id::bigint
        ) INTO v_group_exists;

        IF NOT v_group_exists THEN
            -- Erstelle neue Gruppe
            INSERT INTO dragdrop_groups (
                question_id,
                group_name
            ) VALUES (
                NEW.id::bigint,  -- Cast zu bigint
                'Gruppe ' || NEW.id::text
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- Trigger erstellen
DROP TRIGGER IF EXISTS create_dragdrop_group_trigger ON questions;
CREATE TRIGGER create_dragdrop_group_trigger
    AFTER INSERT ON questions
    FOR EACH ROW
    EXECUTE FUNCTION create_dragdrop_group();
