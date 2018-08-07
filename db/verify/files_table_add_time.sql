-- Verify emapic:files_table_add_time on pg

BEGIN;

	SELECT has_column_privilege(:'emapic_db_user', 'metadata.files', 'datetime_created', 'select');

ROLLBACK;
