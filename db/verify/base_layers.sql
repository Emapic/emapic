-- Verify emapic:base_layers on pg

BEGIN;

SELECT 0/(CASE WHEN count(*) != 8183 THEN 0 ELSE 1 END) FROM base_layers.municipalities;
SELECT 0/(CASE WHEN count(*) != 4646 THEN 0 ELSE 1 END) FROM base_layers.provinces;
SELECT 0/(CASE WHEN count(*) != 240 THEN 0 ELSE 1 END) FROM base_layers.countries;

ROLLBACK;
