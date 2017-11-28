-- Verify emapic:country_names_gl on pg

BEGIN;

	SELECT has_column_privilege(:'emapic_db_user', 'base_layers.countries', 'name_gl', 'select');

ROLLBACK;
