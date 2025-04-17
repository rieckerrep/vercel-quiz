-- File: get_user_items.sql
DROP FUNCTION IF EXISTS get_user_items(
    p_user_id UUID
);

CREATE OR REPLACE FUNCTION "public"."get_user_items"("p_user_id" uuid) RETURNS TABLE("item_id" integer, "item_name" text, "quantity" integer)
    LANGUAGE "sql"
    AS $$
  SELECT
    ui.item_id,
    i.name,
    ui.quantity
  FROM user_items ui
  JOIN items i ON ui.item_id = i.id
  WHERE ui.user_id = p_user_id;
$$;
