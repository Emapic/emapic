-- Verify emapic:rename_madrid_nombre_columns on pg

BEGIN;

	SELECT has_column_privilege(:'emapic_db_user', 'base_layers.madrid_distritos', 'name', 'select');
    SELECT has_column_privilege(:'emapic_db_user', 'base_layers.madrid_barrios', 'name', 'select');

ROLLBACK;
