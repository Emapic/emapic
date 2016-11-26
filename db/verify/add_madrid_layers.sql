-- Verify emapic:add_madrid_layers on pg

BEGIN;

SELECT has_function_privilege('assign_province()', 'execute');
SELECT 0/(CASE WHEN count(*) != 128 THEN 0 ELSE 1 END) FROM base_layers.madrid_barrios;
SELECT 0/(CASE WHEN count(*) != 21 THEN 0 ELSE 1 END) FROM base_layers.madrid_distritos;

ROLLBACK;
