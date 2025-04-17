-- File: handle_new_user.sql
DROP FUNCTION IF EXISTS handle_new_user(
    p_user_id UUID
);

CREATE OR REPLACE FUNCTION "public"."handle_new_user"("p_user_id" uuid) RETURNS void
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  insert into public.profiles(id)
  values (new.id);
  return new;
end;
$$;
