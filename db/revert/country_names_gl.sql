-- Revert emapic:country_names_gl from pg

BEGIN;

	ALTER TABLE base_layers.countries DROP COLUMN name_gl;

	UPDATE base_layers.countries SET name_es='Nueva Zealand' WHERE gid = 166;

COMMIT;
