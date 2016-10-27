-- Revert emapic:add_simplified_geoms to pg

BEGIN;

	ALTER TABLE base_layers.countries DROP COLUMN simp_geom;
	ALTER TABLE base_layers.provinces DROP COLUMN simp_geom;
	ALTER TABLE base_layers.municipalities DROP COLUMN simp_geom;

COMMIT;
