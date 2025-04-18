-- File: check_and_reward_answer.sql
CREATE OR REPLACE FUNCTION "public"."check_and_reward_answer"("p_user_id" "uuid", "p_context_id" "uuid", "p_question_type" "text", "p_is_correct" boolean) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_rt            record;
  v_xp            integer;
  v_coins         integer;
BEGIN
  -- Reward‑ und Penalty‑Werte holen
  SELECT id, base_xp, base_coins, xp_penalty, coin_penalty
    INTO v_rt
  FROM public.reward_types
  WHERE question_type = p_question_type
    AND reward_type   = p_question_type || '_reward';

  -- Beträge festlegen
  IF p_is_correct THEN
    v_xp    := v_rt.base_xp;
    v_coins := v_rt.base_coins;
  ELSE
    v_xp    := -v_rt.xp_penalty;
    v_coins := -v_rt.coin_penalty;
  END IF;

  -- Einmal‑Check (keine Doppel‑Belohnung, keine Doppel‑Strafe)
  IF EXISTS (
    SELECT 1
      FROM public.answered_rewards ar
     WHERE ar.user_id             = p_user_id
       AND ar.question_context_id = p_context_id
       AND ar.reward_type_id      = v_rt.id
  ) THEN
    RETURN;
  END IF;

  -- Eintrag in answered_rewards (kann negativ sein)
  INSERT INTO public.answered_rewards (
    user_id,
    question_context_id,
    reward_type_id,
    xp_earned,
    coins_earned
  ) VALUES (
    p_user_id,
    p_context_id,
    v_rt.id,
    v_xp,
    v_coins
  );

  -- User‑Stats updaten (negatives v_coins zieht ab)
  UPDATE public.user_stats
     SET total_xp    = COALESCE(total_xp,0) + v_xp,
         total_coins = COALESCE(total_coins,0) + v_coins
   WHERE user_id = p_user_id;
END;
$$;
