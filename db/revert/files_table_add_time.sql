-- Revert emapic:files_table_add_time from pg

BEGIN;

    ALTER TABLE metadata.files ADD COLUMN date_created DATE DEFAULT now();
    UPDATE metadata.files SET date_created = datetime_created;
    ALTER TABLE metadata.files DROP COLUMN datetime_created;

COMMIT;
