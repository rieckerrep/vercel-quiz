-- Migration: Standardisiere apply_penalty_for_wrong_answers Funktion
-- Datum: 2024-04-19
-- Beschreibung: 
--   - Fügt Fehlerbehandlung hinzu
--   - Verbessert die Dokumentation
--   - Ändert den Rückgabetyp zu JSONB
--   - Fügt detailliertere Rückgabewerte hinzu
--   - Fügt Prüfungen für Benutzer und Fragen hinzu

DROP FUNCTION IF EXISTS public.apply_penalty_for_wrong_answers(
    user_id UUID,
    wrong_question_ids BIGINT[]
);

CREATE OR REPLACE FUNCTION public.apply_penalty_for_wrong_answers(
    user_id UUID,
    wrong_question_ids BIGINT[]
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    new_wrong_ids BIGINT[];
    total_coin_loss INTEGER := 0;
    user_exists BOOLEAN;
    questions_exist BOOLEAN;
BEGIN
    -- Prüfe ob Benutzer existiert
    SELECT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = user_id
    ) INTO user_exists;
    
    IF NOT user_exists THEN
        RETURN jsonb_build_object('status', 'error', 'message', '❌ Benutzer nicht gefunden');
    END IF;

    -- Prüfe ob Fragen existieren
    SELECT EXISTS (
        SELECT 1 FROM questions 
        WHERE id = ANY(wrong_question_ids)
    ) INTO questions_exist;
    
    IF NOT questions_exist THEN
        RETURN jsonb_build_object('status', 'error', 'message', '❌ Keine gültigen Fragen gefunden');
    END IF;

    -- Neue, falsche Antworten identifizieren (Anti-Farming)
    SELECT ARRAY_AGG(q.id)
    INTO new_wrong_ids
    FROM questions q
    WHERE q.id = ANY(wrong_question_ids)
        AND NOT EXISTS (
            SELECT 1 FROM answered_questions aq
            WHERE aq.user_id = apply_penalty_for_wrong_answers.user_id 
            AND aq.question_id = q.id
        );

    -- Gesamtverlust berechnen
    IF new_wrong_ids IS NOT NULL THEN
        SELECT COALESCE(SUM(qt.base_lose_coins), 0)
        INTO total_coin_loss
        FROM questions q
        JOIN question_types qt ON q.question_type_id = qt.id
        WHERE q.id = ANY(new_wrong_ids)
            AND qt.base_lose_coins > 0;

        -- Als falsch gespeichert
        INSERT INTO answered_questions (user_id, question_id, is_correct, answered_at)
        SELECT apply_penalty_for_wrong_answers.user_id, unnest(new_wrong_ids), FALSE, NOW();

        -- Coins abziehen
        UPDATE user_stats
        SET total_coins = GREATEST(total_coins - total_coin_loss, 0)
        WHERE user_id = apply_penalty_for_wrong_answers.user_id;
    END IF;

    RETURN jsonb_build_object(
        'status', 'success',
        'message', '✅ Bestrafung angewendet',
        'total_coin_loss', total_coin_loss,
        'affected_questions', COALESCE(array_length(new_wrong_ids, 1), 0),
        'wrong_question_ids', wrong_question_ids
    );
END;
$$; 