-- Verify emapic:ceuta_melilla_spain on pg

BEGIN;

    SELECT 1 / (CASE WHEN count(*) = 0 THEN 1 ELSE 0 END) FROM base_layers.provinces WHERE admin = 'Spain' AND country_gid != (SELECT gid FROM base_layers.countries WHERE name = 'Spain');

    SELECT 1 / (CASE WHEN st_contains(geom, (SELECT st_union(geom) FROM base_layers.provinces WHERE admin = 'Spain' AND type_en = 'Autonomous City')) THEN 1 ELSE 0 END) FROM base_layers.countries WHERE name = 'Spain';

    SELECT 1 / (CASE WHEN st_contains(simp_geom, (SELECT st_union(simp_geom) FROM base_layers.provinces WHERE admin = 'Spain' AND type_en = 'Autonomous City')) THEN 1 ELSE 0 END) FROM base_layers.countries WHERE name = 'Spain';

    SELECT 1 / (CASE WHEN st_area(st_intersection(geom, (SELECT st_union(geom) FROM base_layers.provinces WHERE admin = 'Spain' AND type_en = 'Autonomous City'))) <= 0.0000000001 THEN 1 ELSE 0 END) FROM base_layers.countries WHERE name = 'Morocco';

    SELECT 1 / (CASE WHEN st_area(st_intersection(simp_geom, (SELECT st_union(simp_geom) FROM base_layers.provinces WHERE admin = 'Spain' AND type_en = 'Autonomous City'))) <= 0.0000000001 THEN 1 ELSE 0 END) FROM base_layers.countries WHERE name = 'Morocco';

ROLLBACK;
