-- Verify emapic:country_names_es on pg

BEGIN;

	SELECT has_column_privilege(:'emapic_db_user', 'base_layers.countries', 'name_es', 'select');

ROLLBACK;
