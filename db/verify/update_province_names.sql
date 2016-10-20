-- Verify emapic:update_province_names on pg

BEGIN;

	SELECT 1/0 ^ count(*) FROM (SELECT name FROM base_layers.provinces GROUP BY name, country_gid HAVING count(*) > 1) a;

ROLLBACK;
