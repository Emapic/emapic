-- Verify emapic:fix_vigo_municipality_geoms on pg

BEGIN;

    SELECT 1 / (CASE WHEN st_numgeometries(geom) = 3 AND st_numgeometries(simp_geom) = 3 THEN 1 ELSE 0 END) FROM base_layers.municipalities WHERE codigo = '36057';

ROLLBACK;
