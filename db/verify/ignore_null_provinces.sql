-- Verify emapic:ignore_null_provinces on pg

BEGIN;

    SELECT 1 / COUNT(*)
    FROM pg_proc
    WHERE proname = 'assign_province' AND pg_get_functiondef(oid) ILIKE '%FROM base_layers.provinces WHERE name IS NOT NULL%';

ROLLBACK;
