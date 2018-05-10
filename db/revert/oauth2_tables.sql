-- Revert emapic:oauth2_tables from pg

BEGIN;

    DROP SCHEMA oauth2 CASCADE;

COMMIT;
