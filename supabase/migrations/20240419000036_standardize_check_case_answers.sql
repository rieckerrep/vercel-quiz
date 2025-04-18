-- Migration: Standardisierung der check_case_answers Funktion
-- Beschreibung: Verbesserung der Dokumentation, Formatierung und Fehlerbehandlung

-- Funktion zum Überprüfen von Fallfragen-Antworten
-- Parameter:
--   question_id: ID der Hauptfrage
--   answers: JSONB Array mit Antworten im Format:
--           [{"subquestion_id": 1, "answer": "text"}, ...]
-- Rückgabewert: JSONB Array mit Ergebnissen im Format:
--              [{"subquestion_id": 1, "statement_text": "text", "is_correct": true}, ...]

DROP FUNCTION IF EXISTS public.check_case_answers(
    question_id INTEGER,
    answers JSONB
);

CREATE OR REPLACE FUNCTION public.check_case_answers(
    question_id INTEGER,
    answers JSONB
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    result JSONB := '[]'::jsonb;
    subquestion RECORD;
    is_correct BOOLEAN;
    question_exists BOOLEAN;
BEGIN
    -- Prüfe ob Frage existiert
    SELECT EXISTS (
        SELECT 1 FROM questions 
        WHERE id = question_id
    ) INTO question_exists;
    
    IF NOT question_exists THEN
        RAISE EXCEPTION '❌ Frage nicht gefunden';
    END IF;

    -- Prüfe ob es sich um eine Fallfrage handelt
    IF NOT EXISTS (
        SELECT 1 FROM cases_subquestions 
        WHERE question_id = question_id
    ) THEN
        RAISE EXCEPTION '❌ Keine Fallfrage';
    END IF;

    -- Überprüfe jede Unterfrage
    FOR subquestion IN 
        SELECT id, correct_answer, statement_text
        FROM cases_subquestions
        WHERE question_id = question_id
    LOOP
        -- Prüfe ob die Antwort korrekt ist
        SELECT (jsonb_array_elements(answers)->>'answer')::text = subquestion.correct_answer
        INTO is_correct
        WHERE (jsonb_array_elements(answers)->>'subquestion_id')::integer = subquestion.id;

        -- Füge Ergebnis zum Result-Array hinzu
        result := result || jsonb_build_object(
            'subquestion_id', subquestion.id,
            'statement_text', subquestion.statement_text,
            'is_correct', COALESCE(is_correct, false)
        );
    END LOOP;

    RETURN result;
END;
$$; 