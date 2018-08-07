-- Deploy emapic:files_table_add_time to pg
-- requires: create_files_table

BEGIN;

    ALTER TABLE metadata.files ADD COLUMN datetime_created TIMESTAMP WITHOUT TIME ZONE DEFAULT now();
    UPDATE metadata.files SET datetime_created = date_created;
    ALTER TABLE metadata.files DROP COLUMN date_created;

COMMIT;
