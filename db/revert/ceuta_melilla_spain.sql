-- Revert emapic:ceuta_melilla_spain from pg

BEGIN;

    UPDATE base_layers.provinces set country_gid = (SELECT gid FROM base_layers.countries WHERE name = 'Morocco') WHERE admin = 'Spain' AND type_en = 'Autonomous City';

    UPDATE base_layers.countries SET
        geom = (SELECT st_multi(st_union(geom, (SELECT st_union(geom) FROM base_layers.provinces WHERE admin = 'Spain' AND type_en = 'Autonomous City'))) FROM base_layers.countries WHERE name = 'Morocco'),
        simp_geom = (SELECT st_multi(st_union(simp_geom, (SELECT st_union(simp_geom) FROM base_layers.provinces WHERE admin = 'Spain' AND type_en = 'Autonomous City'))) FROM base_layers.countries WHERE name = 'Morocco')
    WHERE name = 'Morocco';

    UPDATE base_layers.countries SET
        geom = (SELECT st_multi(st_difference(geom, (SELECT st_union(geom) FROM base_layers.provinces WHERE admin = 'Spain' AND type_en = 'Autonomous City'))) FROM base_layers.countries WHERE name = 'Spain'),
        simp_geom = (SELECT st_multi(st_difference(simp_geom, (SELECT st_union(simp_geom) FROM base_layers.provinces WHERE admin = 'Spain' AND type_en = 'Autonomous City'))) FROM base_layers.countries WHERE name = 'Spain')
    WHERE name = 'Spain';

COMMIT;
