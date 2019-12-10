-- Verify emapic:add_custom_single_marker on pg

BEGIN;

	SELECT 1 / CASE WHEN has_column_privilege(:'emapic_db_user', 'metadata.surveys', 'custom_single_marker_file_id', 'select, insert, update') THEN 1 ELSE 0 END;

ROLLBACK;
