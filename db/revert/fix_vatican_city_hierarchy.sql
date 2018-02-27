-- Revert emapic:fix_vatican_city_hierarchy from pg

BEGIN;

    SELECT 1/(CASE WHEN a.name = 'Vatican' THEN 1 ELSE 0 END) FROM base_layers.countries a JOIN base_layers.provinces b ON b.country_gid = a.gid WHERE b.name = 'Vatican';

COMMIT;
