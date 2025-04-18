-- File: get_user_items.sql
CREATE OR REPLACE FUNCTION "public"."get_user_items"("p_user_id" "uuid") RETURNS TABLE("item_id" "uuid", "name" "text", "description" "text", "type" "text", "icon_url" "text", "quantity" integer, "is_active" boolean, "acquired_at" timestamp without time zone)
    LANGUAGE "sql" STABLE
    AS $$
  SELECT
    ui.item_id,
    i.name,
    i.description,
    i.type,
    i.icon_url,
    ui.quantity,
    ui.is_active,
    ui.acquired_at
  FROM public.user_items ui
  JOIN public.items i ON ui.item_id = i.id
  WHERE ui.user_id = p_user_id
  ORDER BY i.type, i.name;
$$;
