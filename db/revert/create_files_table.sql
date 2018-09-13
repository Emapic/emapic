-- Revert emapic:create_files_table from pg

BEGIN;

    DROP TABLE metadata.files;

COMMIT;
