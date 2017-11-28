-- Revert emapic:province_names_gl from pg

BEGIN;

	ALTER TABLE base_layers.provinces DROP COLUMN name_gl;

COMMIT;
