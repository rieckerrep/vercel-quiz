-- Bereinige doppelte Einträge in user_stats
WITH ranked_stats AS (
  SELECT *,
         ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) as rn
  FROM user_stats
)
DELETE FROM user_stats
WHERE id IN (
  SELECT id
  FROM ranked_stats
  WHERE rn > 1
);

-- Erstelle einen Unique-Index auf user_id
ALTER TABLE user_stats ADD CONSTRAINT user_stats_user_id_key UNIQUE (user_id);

-- Füge NOT NULL Constraint hinzu
ALTER TABLE user_stats ALTER COLUMN user_id SET NOT NULL; 