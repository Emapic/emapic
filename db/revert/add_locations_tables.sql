-- Revert emapic:add_locations_tables from pg

BEGIN;

    DROP SCHEMA locations CASCADE;

    DROP TABLE metadata.location_groups;

COMMIT;
