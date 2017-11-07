-- Deploy emapic:ceuta_melilla_spain to pg
-- requires: base_layers

BEGIN;

    UPDATE base_layers.provinces set country_gid = (SELECT gid FROM base_layers.countries WHERE name = 'Spain') WHERE admin = 'Spain';

    UPDATE base_layers.countries SET
        geom = (SELECT st_union(geom, (SELECT st_union(geom) FROM base_layers.provinces WHERE admin = 'Spain' AND type_en = 'Autonomous City')) FROM base_layers.countries WHERE name = 'Spain'),
        simp_geom = (SELECT st_union(simp_geom, (SELECT st_union(simp_geom) FROM base_layers.provinces WHERE admin = 'Spain' AND type_en = 'Autonomous City')) FROM base_layers.countries WHERE name = 'Spain')
    WHERE name = 'Spain';

    UPDATE base_layers.countries SET
        geom = (SELECT st_multi(geom) FROM (SELECT (a.dump).geom AS geom FROM (SELECT st_dump(st_difference(geom, (SELECT st_union(geom) FROM base_layers.provinces WHERE admin = 'Spain' AND type_en = 'Autonomous City'))) AS dump  FROM base_layers.countries WHERE name = 'Morocco') a) b ORDER BY st_area(geom) DESC LIMIT 1),
        simp_geom = (SELECT st_multi(geom) FROM (SELECT (a.dump).geom AS geom FROM (SELECT st_dump(st_difference(simp_geom, (SELECT st_union(simp_geom) FROM base_layers.provinces WHERE admin = 'Spain' AND type_en = 'Autonomous City'))) AS dump  FROM base_layers.countries WHERE name = 'Morocco') a) b ORDER BY st_area(geom) DESC LIMIT 1)
    WHERE name = 'Morocco';

COMMIT;
