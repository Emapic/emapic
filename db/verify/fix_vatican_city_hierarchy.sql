-- Verify emapic:fix_vatican_city_hierarchy on pg

BEGIN;

    UPDATE base_layers.provinces SET country_gid = (SELECT gid FROM base_layers.countries WHERE name = 'Italy') WHERE name = 'Vatican';

ROLLBACK;
