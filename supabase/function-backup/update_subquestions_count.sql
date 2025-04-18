-- File: update_subquestions_count.sql
-- Trigger-Funktion zum Aktualisieren der Anzahl der Unterfragen
-- Wird automatisch ausgeführt, wenn sich Unterfragen ändern
-- Aktualisiert den subquestions_count in der questions Tabelle

DROP FUNCTION IF EXISTS public.update_subquestions_count() CASCADE;

CREATE OR REPLACE FUNCTION public.update_subquestions_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Aktualisiere die Anzahl der Unterfragen für die betroffene Frage
    UPDATE questions
    SET subquestions_count = (
        SELECT COUNT(*) 
        FROM cases_subquestions 
        WHERE question_id = NEW.question_id
    )
    WHERE id = NEW.question_id;

    RETURN NEW;
END;
$$;

-- Trigger erstellen
DROP TRIGGER IF EXISTS update_subquestions_count_trigger ON cases_subquestions;
CREATE TRIGGER update_subquestions_count_trigger
    AFTER INSERT OR UPDATE OR DELETE ON cases_subquestions
    FOR EACH ROW
    EXECUTE FUNCTION update_subquestions_count();
