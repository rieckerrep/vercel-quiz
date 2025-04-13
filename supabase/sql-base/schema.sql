

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."calculate_and_award_xp"("p_user_id" "uuid", "p_correct_answers" integer, "p_question_ids" "uuid"[]) RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_total_xp integer := 0;
  v_answered_question_ids uuid[];
  v_case_question_ids uuid[];
BEGIN
  -- Hole bereits beantwortete Fragen
  SELECT array_agg(question_id) INTO v_answered_question_ids
  FROM answered_questions
  WHERE user_id = p_user_id;

  -- Berechne XP für neue korrekte Antworten
  v_total_xp := (p_correct_answers - array_length(v_answered_question_ids, 1)) * 10;

  -- Hole Fallfragen aus den übergebenen IDs
  SELECT array_agg(id) INTO v_case_question_ids
  FROM questions
  WHERE id = ANY(p_question_ids)
  AND type = 'cases';

  -- Berechne zusätzliche XP für Fallfragen
  FOR i IN 1..array_length(v_case_question_ids, 1) LOOP
    IF NOT v_case_question_ids[i] = ANY(v_answered_question_ids) THEN
      SELECT COUNT(*) INTO v_total_xp
      FROM cases_subquestions
      WHERE question_id = v_case_question_ids[i];
      v_total_xp := v_total_xp + (v_total_xp * 5);
    END IF;
  END LOOP;

  -- Aktualisiere die Statistiken
  UPDATE user_stats
  SET 
    answered_questions = answered_questions + p_correct_answers,
    correct_answers = correct_answers + p_correct_answers,
    total_xp = total_xp + v_total_xp
  WHERE user_id = p_user_id;

  -- Speichere die beantworteten Fragen
  INSERT INTO answered_questions (user_id, question_id, answered_at)
  SELECT p_user_id, unnest(p_question_ids), NOW()
  ON CONFLICT (user_id, question_id) DO NOTHING;

  RETURN v_total_xp;
END;
$$;


ALTER FUNCTION "public"."calculate_and_award_xp"("p_user_id" "uuid", "p_correct_answers" integer, "p_question_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_dragdrop_group"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  INSERT INTO dragdrop_groups (question_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_dragdrop_group"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_league_leaderboard"("league_name" "text") RETURNS TABLE("username" "text", "xp" bigint)
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
    SELECT p.username,
           s.total_xp AS xp
    FROM user_stats s
    JOIN profiles p ON p.id = s.user_id
    WHERE s.current_league = league_name
    ORDER BY s.total_xp DESC
$$;


ALTER FUNCTION "public"."get_league_leaderboard"("league_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_player_leaderboard"() RETURNS TABLE("username" "text", "xp" bigint)
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
    SELECT p.username,
           s.total_xp AS xp
    FROM user_stats s
    JOIN profiles p ON p.id = s.user_id
    ORDER BY s.total_xp DESC
    LIMIT 50
$$;


ALTER FUNCTION "public"."get_player_leaderboard"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_subject_breakdown_for_user"("_user_id" "uuid") RETURNS TABLE("subject_name" "text", "correct_count" integer, "wrong_count" integer, "total" integer, "correct_percent" integer)
    LANGUAGE "sql" STABLE
    AS $$
  SELECT
    s.name AS subject_name,
    SUM(CASE WHEN aq.is_correct THEN 1 ELSE 0 END) AS correct_count,
    SUM(CASE WHEN aq.is_correct THEN 0 ELSE 1 END) AS wrong_count,
    COUNT(*) AS total,
    ROUND( (SUM(CASE WHEN aq.is_correct THEN 1 ELSE 0 END)::decimal / COUNT(*) * 100) )::int AS correct_percent
  FROM answered_questions aq
  JOIN questions q
    ON q.id = aq.question_id
  JOIN chapters ch
    ON ch.id = q.chapter_id
  JOIN courses co
    ON co.id = ch.course_id
  JOIN subjects s
    ON s.id = co.subject_id
  WHERE aq.user_id = _user_id
  GROUP BY s.name
  ORDER BY s.name;
$$;


ALTER FUNCTION "public"."get_subject_breakdown_for_user"("_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_university_contributors"("uni_name" "text") RETURNS TABLE("username" "text", "total_xp" bigint, "user_id" "text")
    LANGUAGE "sql"
    AS $$
    SELECT 
        COALESCE(p.username, us.username) as username,
        COALESCE(us.total_xp, 0) as total_xp,
        p.id as user_id
    FROM profiles p
    LEFT JOIN user_stats us ON p.id = us.user_id
    WHERE p.university = uni_name
    ORDER BY us.total_xp DESC NULLS LAST;
$$;


ALTER FUNCTION "public"."get_university_contributors"("uni_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_university_leaderboard"() RETURNS TABLE("university" "text", "xp_sum" bigint)
    LANGUAGE "sql"
    AS $$
    SELECT 
        p.university,
        COALESCE(SUM(us.total_xp), 0) as xp_sum
    FROM profiles p
    LEFT JOIN user_stats us ON p.id = us.user_id
    WHERE p.university IS NOT NULL
    GROUP BY p.university
    ORDER BY xp_sum DESC;
$$;


ALTER FUNCTION "public"."get_university_leaderboard"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  insert into public.profiles(id)
  values (new.id);
  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reset_leagues"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  rec RECORD;
  promotion_threshold CONSTANT INTEGER := 10;  -- Top 10
  demotion_threshold CONSTANT INTEGER := 5;    -- Unterste 5
  next_league TEXT;
  prev_league TEXT;
BEGIN
  -- Für jede existierende Liga in user_stats
  FOR rec IN
    SELECT DISTINCT current_league FROM user_stats
  LOOP
    -- Bestimme anhand des aktuellen Liga-Namens, welches die nächsthöhere und nächstniedrigere Liga ist.
    IF rec.current_league = 'Holzliga' THEN
      next_league := 'Bronzeliga';
      prev_league := NULL;  -- Keine Abstufung, da Holzliga die unterste ist.
    ELSIF rec.current_league = 'Bronzeliga' THEN
      next_league := 'Silberliga';
      prev_league := 'Holzliga';
    ELSIF rec.current_league = 'Silberliga' THEN
      next_league := 'Goldliga';
      prev_league := 'Bronzeliga';
    ELSIF rec.current_league = 'Goldliga' THEN
      next_league := 'Platinliga';
      prev_league := 'Silberliga';
    ELSIF rec.current_league = 'Platinliga' THEN
      next_league := 'Champions League';
      prev_league := 'Goldliga';
    ELSE
      next_league := NULL;
      prev_league := NULL;
    END IF;

    -- Befördere die Top 10 (Promotion), sofern es eine nächste Liga gibt:
    IF next_league IS NOT NULL THEN
      WITH ranked AS (
        SELECT user_id, total_xp,
               ROW_NUMBER() OVER (ORDER BY total_xp DESC) as rn
        FROM user_stats
        WHERE current_league = rec.current_league
      )
      UPDATE user_stats
      SET current_league = next_league
      FROM ranked
      WHERE user_stats.user_id = ranked.user_id
        AND ranked.rn <= promotion_threshold;
    END IF;

    -- Stufe die untersten 5 Spieler ab (Demotion), sofern es eine niedrigere Liga gibt:
    IF prev_league IS NOT NULL THEN
      WITH ranked AS (
        SELECT user_id, total_xp,
               ROW_NUMBER() OVER (ORDER BY total_xp ASC) as rn
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

  RAISE NOTICE 'Leagues have been reset with promotion/demotion logic applied.';
END;
$$;


ALTER FUNCTION "public"."reset_leagues"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reset_uni_leaderboard"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Beispiel: Setze das monatliche Score-Feld zurück
  UPDATE universities
  SET monthly_uni_scores = 0;
  
  RAISE NOTICE 'University leaderboard has been reset.';
END;
$$;


ALTER FUNCTION "public"."reset_uni_leaderboard"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_league_groups"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  WITH ranked AS (
    SELECT 
      user_id,
      current_league,  -- z. B. "Holzliga", "Bronzeliga" etc.
      ROW_NUMBER() OVER (PARTITION BY current_league ORDER BY total_xp DESC) AS rn
    FROM user_stats
  )
  UPDATE user_stats us
  SET league_group = CONCAT(us.current_league, ' ', CEIL(r.rn::numeric / 30))
  FROM ranked r
  WHERE us.user_id = r.user_id;
END;
$$;


ALTER FUNCTION "public"."update_league_groups"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_level_on_xp_change"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Suche das höchste Level, dessen xp_required <= NEW.total_xp
  SELECT level_number
    INTO NEW.level
    FROM levels
    WHERE xp_required <= NEW.total_xp
    ORDER BY xp_required DESC
    LIMIT 1;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_level_on_xp_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_subquestions_count"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE questions
  SET subquestions_count = (
    SELECT COUNT(*) FROM cases_subquestions WHERE question_id = NEW.question_id
  )
  WHERE id = NEW.question_id;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_subquestions_count"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."answered_cases_subquestions" (
    "id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "subquestion_id" bigint NOT NULL,
    "is_correct" boolean
);


ALTER TABLE "public"."answered_cases_subquestions" OWNER TO "postgres";


ALTER TABLE "public"."answered_cases_subquestions" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."answered_cases_subquestions_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."answered_questions" (
    "id" bigint NOT NULL,
    "user_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "question_id" bigint,
    "is_correct" boolean,
    "answered_at" timestamp without time zone,
    "chapter_id" integer
);


ALTER TABLE "public"."answered_questions" OWNER TO "postgres";


ALTER TABLE "public"."answered_questions" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."answered_questions_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."cases_subquestions" (
    "id" bigint NOT NULL,
    "question_id" bigint NOT NULL,
    "statement_text" "text" NOT NULL,
    "correct_answer" "text" NOT NULL,
    "explanation" "text"
);


ALTER TABLE "public"."cases_subquestions" OWNER TO "postgres";


ALTER TABLE "public"."cases_subquestions" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."cases_subquestions_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."chapters" (
    "id" bigint NOT NULL,
    "course_id" bigint NOT NULL,
    "name" "text"
);


ALTER TABLE "public"."chapters" OWNER TO "postgres";


ALTER TABLE "public"."chapters" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."chapters_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."courses" (
    "id" bigint NOT NULL,
    "subject_id" bigint NOT NULL,
    "name" "text"
);


ALTER TABLE "public"."courses" OWNER TO "postgres";


ALTER TABLE "public"."courses" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."courses_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."dragdrop_groups" (
    "id" bigint NOT NULL,
    "question_id" bigint NOT NULL,
    "group_name" "text"
);


ALTER TABLE "public"."dragdrop_groups" OWNER TO "postgres";


ALTER TABLE "public"."dragdrop_groups" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."dragdrop_groups_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."dragdrop_pairs" (
    "id" bigint NOT NULL,
    "group_id" bigint NOT NULL,
    "drag_text" "text",
    "correct_match" "text"
);


ALTER TABLE "public"."dragdrop_pairs" OWNER TO "postgres";


ALTER TABLE "public"."dragdrop_pairs" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."dragdrop_pairs_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."league_positions" (
    "user_id" "uuid" NOT NULL,
    "league_name" "text" NOT NULL,
    "points" bigint DEFAULT 0,
    "ranking" integer,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."league_positions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."leagues" (
    "id" bigint NOT NULL,
    "name" "text" NOT NULL,
    "league_img" "text"
);


ALTER TABLE "public"."leagues" OWNER TO "postgres";


ALTER TABLE "public"."leagues" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."leagues_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."levels" (
    "id" integer NOT NULL,
    "level_number" integer NOT NULL,
    "xp_required" bigint NOT NULL,
    "level_image" "text",
    "level_title" "text"
);


ALTER TABLE "public"."levels" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."levels_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."levels_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."levels_id_seq" OWNED BY "public"."levels"."id";



CREATE TABLE IF NOT EXISTS "public"."monthly_uni_scores" (
    "id" integer NOT NULL,
    "university_id" integer,
    "xp_this_month" integer DEFAULT 0 NOT NULL,
    "month_start" "date" NOT NULL,
    "month_end" "date" NOT NULL
);


ALTER TABLE "public"."monthly_uni_scores" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."monthly_uni_scores_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."monthly_uni_scores_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."monthly_uni_scores_id_seq" OWNED BY "public"."monthly_uni_scores"."id";



CREATE TABLE IF NOT EXISTS "public"."multiple_choice_options" (
    "id" bigint NOT NULL,
    "question_id" bigint NOT NULL,
    "option_text" "text" NOT NULL,
    "is_correct" boolean NOT NULL
);


ALTER TABLE "public"."multiple_choice_options" OWNER TO "postgres";


ALTER TABLE "public"."multiple_choice_options" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."multiple_choice_options_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "username" "text",
    "avatar_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "university" "text"
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."questions" (
    "id" bigint NOT NULL,
    "chapter_id" bigint NOT NULL,
    "Frage" "text",
    "type" "text",
    "Antwort A" "text",
    "Antwort B" "text",
    "Antwort C" "text",
    "Antwort D" "text",
    "Richtige Antwort" "text",
    "Begruendung" "text",
    "course_id" bigint,
    "subquestions_count" integer DEFAULT 0
);


ALTER TABLE "public"."questions" OWNER TO "postgres";


ALTER TABLE "public"."questions" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."questions_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."quiz_progress" (
    "id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "chapter_id" integer NOT NULL,
    "progress" integer DEFAULT 0 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."quiz_progress" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."quiz_progress_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."quiz_progress_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."quiz_progress_id_seq" OWNED BY "public"."quiz_progress"."id";



CREATE TABLE IF NOT EXISTS "public"."sequence_items" (
    "id" bigint NOT NULL,
    "question_id" bigint,
    "text" "text",
    "correct_position" bigint,
    "level" "text"
);


ALTER TABLE "public"."sequence_items" OWNER TO "postgres";


ALTER TABLE "public"."sequence_items" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."sequence_items_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."shop_avatars" (
    "id" integer NOT NULL,
    "image_url" "text" NOT NULL,
    "price" integer NOT NULL,
    "active" boolean DEFAULT true,
    "title" "text",
    "category" "text"
);


ALTER TABLE "public"."shop_avatars" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."shop_avatars_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."shop_avatars_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."shop_avatars_id_seq" OWNED BY "public"."shop_avatars"."id";



CREATE TABLE IF NOT EXISTS "public"."subjects" (
    "id" bigint NOT NULL,
    "name" "text" NOT NULL
);


ALTER TABLE "public"."subjects" OWNER TO "postgres";


ALTER TABLE "public"."subjects" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."subjects_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."universities" (
    "id" integer NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "xp_total" bigint
);


ALTER TABLE "public"."universities" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."universities_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."universities_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."universities_id_seq" OWNED BY "public"."universities"."id";



CREATE TABLE IF NOT EXISTS "public"."user_avatars" (
    "user_id" "uuid" NOT NULL,
    "avatar_id" bigint NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_avatars" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_stats" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "total_xp" bigint,
    "total_coins" bigint,
    "level" bigint,
    "title" "text",
    "created_at" timestamp with time zone,
    "streak" integer,
    "avatar_url" "text",
    "gold_medals" integer DEFAULT 0,
    "silver_medals" integer DEFAULT 0,
    "bronze_medals" integer DEFAULT 0,
    "last_played" timestamp with time zone,
    "current_league" "text",
    "updated_at" timestamp with time zone,
    "league_group" "text",
    "username" "text",
    "questions_answered" bigint,
    "correct_answers" bigint
);


ALTER TABLE "public"."user_stats" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."versions" (
    "id" integer NOT NULL,
    "table_name" character varying(255) NOT NULL,
    "data" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."versions" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."versions_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."versions_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."versions_id_seq" OWNED BY "public"."versions"."id";



ALTER TABLE ONLY "public"."levels" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."levels_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."monthly_uni_scores" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."monthly_uni_scores_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."quiz_progress" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."quiz_progress_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."shop_avatars" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."shop_avatars_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."universities" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."universities_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."versions" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."versions_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."answered_cases_subquestions"
    ADD CONSTRAINT "answered_cases_subquestions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."answered_questions"
    ADD CONSTRAINT "answered_questions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cases_subquestions"
    ADD CONSTRAINT "cases_subquestions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chapters"
    ADD CONSTRAINT "chapters_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."courses"
    ADD CONSTRAINT "courses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dragdrop_groups"
    ADD CONSTRAINT "dragdrop_groups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dragdrop_pairs"
    ADD CONSTRAINT "dragdrop_pairs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."league_positions"
    ADD CONSTRAINT "league_positions_pkey" PRIMARY KEY ("user_id", "league_name");



ALTER TABLE ONLY "public"."leagues"
    ADD CONSTRAINT "leagues_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."levels"
    ADD CONSTRAINT "levels_level_number_key" UNIQUE ("level_number");



ALTER TABLE ONLY "public"."levels"
    ADD CONSTRAINT "levels_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."monthly_uni_scores"
    ADD CONSTRAINT "monthly_uni_scores_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."multiple_choice_options"
    ADD CONSTRAINT "multiple_choice_options_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."questions"
    ADD CONSTRAINT "questions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quiz_progress"
    ADD CONSTRAINT "quiz_progress_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quiz_progress"
    ADD CONSTRAINT "quiz_progress_user_id_chapter_id_key" UNIQUE ("user_id", "chapter_id");



ALTER TABLE ONLY "public"."sequence_items"
    ADD CONSTRAINT "sequence_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shop_avatars"
    ADD CONSTRAINT "shop_avatars_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subjects"
    ADD CONSTRAINT "subjects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."answered_cases_subquestions"
    ADD CONSTRAINT "unique_user_subquestion" UNIQUE ("user_id", "subquestion_id");



ALTER TABLE ONLY "public"."universities"
    ADD CONSTRAINT "universities_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."universities"
    ADD CONSTRAINT "universities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_avatars"
    ADD CONSTRAINT "user_avatars_pkey" PRIMARY KEY ("user_id", "avatar_id");



ALTER TABLE ONLY "public"."user_stats"
    ADD CONSTRAINT "user_stats_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."versions"
    ADD CONSTRAINT "versions_pkey" PRIMARY KEY ("id");



CREATE OR REPLACE TRIGGER "auto_create_group" AFTER INSERT ON "public"."questions" FOR EACH ROW WHEN (("new"."type" = 'drag_drop'::"text")) EXECUTE FUNCTION "public"."create_dragdrop_group"();



CREATE OR REPLACE TRIGGER "cases_subquestions_delete" AFTER DELETE ON "public"."cases_subquestions" FOR EACH ROW EXECUTE FUNCTION "public"."update_subquestions_count"();



CREATE OR REPLACE TRIGGER "cases_subquestions_insert" AFTER INSERT ON "public"."cases_subquestions" FOR EACH ROW EXECUTE FUNCTION "public"."update_subquestions_count"();



CREATE OR REPLACE TRIGGER "cases_subquestions_update" AFTER UPDATE ON "public"."cases_subquestions" FOR EACH ROW EXECUTE FUNCTION "public"."update_subquestions_count"();



CREATE OR REPLACE TRIGGER "trg_user_stats_level" BEFORE UPDATE ON "public"."user_stats" FOR EACH ROW WHEN (("old"."total_xp" IS DISTINCT FROM "new"."total_xp")) EXECUTE FUNCTION "public"."update_level_on_xp_change"();



CREATE OR REPLACE TRIGGER "trigger_update_subquestions_count" AFTER INSERT OR DELETE OR UPDATE ON "public"."cases_subquestions" FOR EACH ROW EXECUTE FUNCTION "public"."update_subquestions_count"();



ALTER TABLE ONLY "public"."answered_cases_subquestions"
    ADD CONSTRAINT "answered_cases_subquestions_subquestion_id_fkey" FOREIGN KEY ("subquestion_id") REFERENCES "public"."cases_subquestions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."answered_questions"
    ADD CONSTRAINT "answered_questions_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id");



ALTER TABLE ONLY "public"."answered_questions"
    ADD CONSTRAINT "answered_questions_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id");



ALTER TABLE ONLY "public"."cases_subquestions"
    ADD CONSTRAINT "cases_subquestions_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chapters"
    ADD CONSTRAINT "chapters_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id");



ALTER TABLE ONLY "public"."courses"
    ADD CONSTRAINT "courses_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id");



ALTER TABLE ONLY "public"."dragdrop_groups"
    ADD CONSTRAINT "dragdrop_groups_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id");



ALTER TABLE ONLY "public"."dragdrop_pairs"
    ADD CONSTRAINT "dragdrop_pairs_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."dragdrop_groups"("id");



ALTER TABLE ONLY "public"."league_positions"
    ADD CONSTRAINT "league_positions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."monthly_uni_scores"
    ADD CONSTRAINT "monthly_uni_scores_university_id_fkey" FOREIGN KEY ("university_id") REFERENCES "public"."universities"("id");



ALTER TABLE ONLY "public"."multiple_choice_options"
    ADD CONSTRAINT "multiple_choice_options_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."questions"
    ADD CONSTRAINT "questions_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id");



ALTER TABLE ONLY "public"."questions"
    ADD CONSTRAINT "questions_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id");



ALTER TABLE ONLY "public"."quiz_progress"
    ADD CONSTRAINT "quiz_progress_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id");



ALTER TABLE ONLY "public"."quiz_progress"
    ADD CONSTRAINT "quiz_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."sequence_items"
    ADD CONSTRAINT "sequence_items_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id");



ALTER TABLE ONLY "public"."user_avatars"
    ADD CONSTRAINT "user_avatars_avatar_id_fkey" FOREIGN KEY ("avatar_id") REFERENCES "public"."shop_avatars"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_avatars"
    ADD CONSTRAINT "user_avatars_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



CREATE POLICY "Enable delete for users based on user_id" ON "public"."profiles" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "id"));



CREATE POLICY "Enable insert for authenticated users only" ON "public"."answered_cases_subquestions" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Enable insert for authenticated users only" ON "public"."answered_questions" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Enable insert for authenticated users only" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Enable insert for authenticated users only" ON "public"."user_stats" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Enable read access for all users" ON "public"."answered_questions" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Enable read access for all users" ON "public"."cases_subquestions" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."chapters" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."courses" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."dragdrop_groups" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."dragdrop_pairs" FOR SELECT TO "authenticated" USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Enable read access for all users" ON "public"."leagues" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."multiple_choice_options" FOR SELECT TO "authenticated" USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Enable read access for all users" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "id"));



CREATE POLICY "Enable read access for all users" ON "public"."questions" FOR SELECT TO "authenticated" USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Enable read access for all users" ON "public"."subjects" FOR SELECT TO "authenticated" USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Enable read access for all users" ON "public"."user_stats" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Enable read access for authenticated users" ON "public"."answered_cases_subquestions" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Enable update for users based on email" ON "public"."answered_cases_subquestions" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Enable update for users based on email" ON "public"."answered_questions" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Enable update for users based on email" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Enable update for users based on email" ON "public"."user_stats" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Erlaube öffentlichen Zugriff auf sequence_items" ON "public"."sequence_items" USING (true) WITH CHECK (true);



CREATE POLICY "For all authenticated" ON "public"."levels" FOR SELECT TO "authenticated" USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Public read access to league_positions" ON "public"."league_positions" FOR SELECT USING (true);



CREATE POLICY "Public read access to monthly_uni_scores" ON "public"."monthly_uni_scores" FOR SELECT USING (true);



CREATE POLICY "Public read access to shop_avatars" ON "public"."shop_avatars" FOR SELECT USING (true);



CREATE POLICY "Public read access to universities" ON "public"."universities" FOR SELECT USING (true);



CREATE POLICY "User can delete their own avatars" ON "public"."user_avatars" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "User can insert their own avatars" ON "public"."user_avatars" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "User can update own league_position" ON "public"."league_positions" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "User can update own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "User can update their own avatars" ON "public"."user_avatars" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "User can view their own avatars" ON "public"."user_avatars" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can read all profiles (e.g. for Leaderboard)" ON "public"."profiles" FOR SELECT USING (true);



ALTER TABLE "public"."answered_cases_subquestions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."answered_questions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cases_subquestions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."chapters" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."courses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."dragdrop_groups" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."dragdrop_pairs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."league_positions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."leagues" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."levels" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."monthly_uni_scores" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."multiple_choice_options" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."questions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sequence_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."shop_avatars" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subjects" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."universities" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_avatars" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_stats" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_and_award_xp"("p_user_id" "uuid", "p_correct_answers" integer, "p_question_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_and_award_xp"("p_user_id" "uuid", "p_correct_answers" integer, "p_question_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_and_award_xp"("p_user_id" "uuid", "p_correct_answers" integer, "p_question_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."create_dragdrop_group"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_dragdrop_group"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_dragdrop_group"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_league_leaderboard"("league_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_league_leaderboard"("league_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_league_leaderboard"("league_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_player_leaderboard"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_player_leaderboard"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_player_leaderboard"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_subject_breakdown_for_user"("_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_subject_breakdown_for_user"("_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_subject_breakdown_for_user"("_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_university_contributors"("uni_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_university_contributors"("uni_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_university_contributors"("uni_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_university_leaderboard"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_university_leaderboard"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_university_leaderboard"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."reset_leagues"() TO "anon";
GRANT ALL ON FUNCTION "public"."reset_leagues"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."reset_leagues"() TO "service_role";



GRANT ALL ON FUNCTION "public"."reset_uni_leaderboard"() TO "anon";
GRANT ALL ON FUNCTION "public"."reset_uni_leaderboard"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."reset_uni_leaderboard"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_league_groups"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_league_groups"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_league_groups"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_level_on_xp_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_level_on_xp_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_level_on_xp_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_subquestions_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_subquestions_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_subquestions_count"() TO "service_role";



GRANT ALL ON TABLE "public"."answered_cases_subquestions" TO "anon";
GRANT ALL ON TABLE "public"."answered_cases_subquestions" TO "authenticated";
GRANT ALL ON TABLE "public"."answered_cases_subquestions" TO "service_role";



GRANT ALL ON SEQUENCE "public"."answered_cases_subquestions_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."answered_cases_subquestions_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."answered_cases_subquestions_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."answered_questions" TO "anon";
GRANT ALL ON TABLE "public"."answered_questions" TO "authenticated";
GRANT ALL ON TABLE "public"."answered_questions" TO "service_role";



GRANT ALL ON SEQUENCE "public"."answered_questions_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."answered_questions_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."answered_questions_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."cases_subquestions" TO "anon";
GRANT ALL ON TABLE "public"."cases_subquestions" TO "authenticated";
GRANT ALL ON TABLE "public"."cases_subquestions" TO "service_role";



GRANT ALL ON SEQUENCE "public"."cases_subquestions_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."cases_subquestions_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."cases_subquestions_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."chapters" TO "anon";
GRANT ALL ON TABLE "public"."chapters" TO "authenticated";
GRANT ALL ON TABLE "public"."chapters" TO "service_role";



GRANT ALL ON SEQUENCE "public"."chapters_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."chapters_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."chapters_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."courses" TO "anon";
GRANT ALL ON TABLE "public"."courses" TO "authenticated";
GRANT ALL ON TABLE "public"."courses" TO "service_role";



GRANT ALL ON SEQUENCE "public"."courses_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."courses_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."courses_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."dragdrop_groups" TO "anon";
GRANT ALL ON TABLE "public"."dragdrop_groups" TO "authenticated";
GRANT ALL ON TABLE "public"."dragdrop_groups" TO "service_role";



GRANT ALL ON SEQUENCE "public"."dragdrop_groups_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."dragdrop_groups_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."dragdrop_groups_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."dragdrop_pairs" TO "anon";
GRANT ALL ON TABLE "public"."dragdrop_pairs" TO "authenticated";
GRANT ALL ON TABLE "public"."dragdrop_pairs" TO "service_role";



GRANT ALL ON SEQUENCE "public"."dragdrop_pairs_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."dragdrop_pairs_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."dragdrop_pairs_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."league_positions" TO "anon";
GRANT ALL ON TABLE "public"."league_positions" TO "authenticated";
GRANT ALL ON TABLE "public"."league_positions" TO "service_role";



GRANT ALL ON TABLE "public"."leagues" TO "anon";
GRANT ALL ON TABLE "public"."leagues" TO "authenticated";
GRANT ALL ON TABLE "public"."leagues" TO "service_role";



GRANT ALL ON SEQUENCE "public"."leagues_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."leagues_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."leagues_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."levels" TO "anon";
GRANT ALL ON TABLE "public"."levels" TO "authenticated";
GRANT ALL ON TABLE "public"."levels" TO "service_role";



GRANT ALL ON SEQUENCE "public"."levels_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."levels_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."levels_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."monthly_uni_scores" TO "anon";
GRANT ALL ON TABLE "public"."monthly_uni_scores" TO "authenticated";
GRANT ALL ON TABLE "public"."monthly_uni_scores" TO "service_role";



GRANT ALL ON SEQUENCE "public"."monthly_uni_scores_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."monthly_uni_scores_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."monthly_uni_scores_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."multiple_choice_options" TO "anon";
GRANT ALL ON TABLE "public"."multiple_choice_options" TO "authenticated";
GRANT ALL ON TABLE "public"."multiple_choice_options" TO "service_role";



GRANT ALL ON SEQUENCE "public"."multiple_choice_options_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."multiple_choice_options_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."multiple_choice_options_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."questions" TO "anon";
GRANT ALL ON TABLE "public"."questions" TO "authenticated";
GRANT ALL ON TABLE "public"."questions" TO "service_role";



GRANT ALL ON SEQUENCE "public"."questions_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."questions_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."questions_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."quiz_progress" TO "anon";
GRANT ALL ON TABLE "public"."quiz_progress" TO "authenticated";
GRANT ALL ON TABLE "public"."quiz_progress" TO "service_role";



GRANT ALL ON SEQUENCE "public"."quiz_progress_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."quiz_progress_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."quiz_progress_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."sequence_items" TO "anon";
GRANT ALL ON TABLE "public"."sequence_items" TO "authenticated";
GRANT ALL ON TABLE "public"."sequence_items" TO "service_role";



GRANT ALL ON SEQUENCE "public"."sequence_items_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."sequence_items_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."sequence_items_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."shop_avatars" TO "anon";
GRANT ALL ON TABLE "public"."shop_avatars" TO "authenticated";
GRANT ALL ON TABLE "public"."shop_avatars" TO "service_role";



GRANT ALL ON SEQUENCE "public"."shop_avatars_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."shop_avatars_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."shop_avatars_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."subjects" TO "anon";
GRANT ALL ON TABLE "public"."subjects" TO "authenticated";
GRANT ALL ON TABLE "public"."subjects" TO "service_role";



GRANT ALL ON SEQUENCE "public"."subjects_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."subjects_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."subjects_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."universities" TO "anon";
GRANT ALL ON TABLE "public"."universities" TO "authenticated";
GRANT ALL ON TABLE "public"."universities" TO "service_role";



GRANT ALL ON SEQUENCE "public"."universities_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."universities_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."universities_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."user_avatars" TO "anon";
GRANT ALL ON TABLE "public"."user_avatars" TO "authenticated";
GRANT ALL ON TABLE "public"."user_avatars" TO "service_role";



GRANT ALL ON TABLE "public"."user_stats" TO "anon";
GRANT ALL ON TABLE "public"."user_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."user_stats" TO "service_role";



GRANT ALL ON TABLE "public"."versions" TO "anon";
GRANT ALL ON TABLE "public"."versions" TO "authenticated";
GRANT ALL ON TABLE "public"."versions" TO "service_role";



GRANT ALL ON SEQUENCE "public"."versions_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."versions_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."versions_id_seq" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






RESET ALL;
