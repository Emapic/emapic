-- Revert emapic:add_custom_single_marker from pg

BEGIN;

    ALTER TABLE metadata.surveys DROP COLUMN custom_single_marker_file_id;

COMMIT;
