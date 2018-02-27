-- Verify emapic:fix_vatican_city_geoms on pg

BEGIN;

    SELECT 1 / (CASE WHEN st_area(st_intersection(geom, (SELECT geom FROM base_layers.countries WHERE name = 'Vatican'))) <= 0.0000000001 THEN 1 ELSE 0 END) FROM base_layers.countries WHERE name = 'Italy';

    SELECT 1 / (CASE WHEN st_area(st_intersection(simp_geom, (SELECT simp_geom FROM base_layers.countries WHERE name = 'Vatican'))) <= 0.0000000001 THEN 1 ELSE 0 END) FROM base_layers.countries WHERE name = 'Italy';

    SELECT 1 / (CASE WHEN st_area(st_intersection(geom, (SELECT geom FROM base_layers.provinces WHERE name = 'Vatican'))) <= 0.0000000001 THEN 1 ELSE 0 END) FROM base_layers.provinces WHERE name = 'Roma';

    SELECT 1 / (CASE WHEN st_area(st_intersection(simp_geom, (SELECT simp_geom FROM base_layers.provinces WHERE name = 'Vatican'))) <= 0.0000000001 THEN 1 ELSE 0 END) FROM base_layers.provinces WHERE name = 'Roma';

ROLLBACK;
