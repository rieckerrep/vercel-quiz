-- File: get_shop_items.sql
CREATE OR REPLACE FUNCTION "public"."get_shop_items"() RETURNS TABLE("id" "uuid", "name" "text", "description" "text", "price" integer, "type" "text", "icon_url" "text")
    LANGUAGE "sql" STABLE
    AS $$
  SELECT 
    i.id,
    i.name,
    i.description,
    i.price,
    i.type,
    i.icon_url
  FROM public.items i
  ORDER BY i.type, i.price;
$$;
