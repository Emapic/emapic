-- Revert emapic:add_locations_tables from pg

BEGIN;

    DROP SCHEMA locations;

    DROP TABLE metadata.location_groups;

COMMIT;
