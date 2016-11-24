-- Verify emapic:add_locations_tables on pg

BEGIN;

    SELECT has_schema_privilege(:'emapic_db_user', 'locations', 'create, usage');
    SELECT has_table_privilege(:'emapic_db_user', 'metadata.location_groups', 'select, insert, update, delete');

ROLLBACK;
