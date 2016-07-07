-- Verify emapic:emapic_db_user on pg

BEGIN;

SELECT has_schema_privilege(:'emapic_db_user', 'base_layers', 'usage');
SELECT has_schema_privilege(:'emapic_db_user', 'public', 'usage');
SELECT has_schema_privilege(:'emapic_db_user', 'metadata', 'usage');
SELECT has_schema_privilege(:'emapic_db_user', 'opinions', 'create, usage');
SELECT has_table_privilege(:'emapic_db_user', 'base_layers.municipalities', 'select');
SELECT has_table_privilege(:'emapic_db_user', 'base_layers.provinces', 'select');
SELECT has_table_privilege(:'emapic_db_user', 'base_layers.countries', 'select');
SELECT has_table_privilege(:'emapic_db_user', 'users', 'select, insert, delete, update');
SELECT has_table_privilege(:'emapic_db_user', 'roles', 'select, insert, delete, update');
SELECT has_table_privilege(:'emapic_db_user', 'rel_users_roles', 'select, insert, delete, update');
SELECT has_table_privilege(:'emapic_db_user', 'metadata.surveys', 'select, insert, delete, update');
SELECT has_table_privilege(:'emapic_db_user', 'metadata.questions', 'select, insert, delete, update');
SELECT has_table_privilege(:'emapic_db_user', 'metadata.answers', 'select, insert, delete, update');
SELECT has_table_privilege(:'emapic_db_user', 'metadata.emapic_opinions', 'select, insert, delete, update');
SELECT has_table_privilege(:'emapic_db_user', 'metadata.geolocation_distances', 'select, insert, delete, update');
SELECT has_table_privilege(:'emapic_db_user', 'metadata.votes', 'select, insert, delete, update');

ROLLBACK;
