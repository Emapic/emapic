-- Verify emapic:create_files_table on pg

BEGIN;

    SELECT 1/CASE WHEN has_table_privilege('metadata.files', 'select') THEN 1 ELSE 0 END;

ROLLBACK;
