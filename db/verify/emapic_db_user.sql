-- Verify emapic:emapic_db_user on pg

BEGIN;

SELECT 1/CASE WHEN has_schema_privilege(:'emapic_db_user', 'base_layers', 'usage') THEN 1 ELSE 0 END;
SELECT 1/CASE WHEN has_schema_privilege(:'emapic_db_user', 'public', 'usage') THEN 1 ELSE 0 END;
SELECT 1/CASE WHEN has_schema_privilege(:'emapic_db_user', 'metadata', 'usage') THEN 1 ELSE 0 END;
SELECT 1/CASE WHEN has_schema_privilege(:'emapic_db_user', 'opinions', 'create, usage') THEN 1 ELSE 0 END;
SELECT 1/CASE WHEN has_table_privilege(:'emapic_db_user', 'base_layers.municipalities', 'select') THEN 1 ELSE 0 END;
SELECT 1/CASE WHEN has_table_privilege(:'emapic_db_user', 'base_layers.provinces', 'select') THEN 1 ELSE 0 END;
SELECT 1/CASE WHEN has_table_privilege(:'emapic_db_user', 'base_layers.countries', 'select') THEN 1 ELSE 0 END;
SELECT 1/CASE WHEN has_table_privilege(:'emapic_db_user', 'users', 'select, insert, delete, update') THEN 1 ELSE 0 END;
SELECT 1/CASE WHEN has_table_privilege(:'emapic_db_user', 'roles', 'select, insert, delete, update') THEN 1 ELSE 0 END;
SELECT 1/CASE WHEN has_table_privilege(:'emapic_db_user', 'rel_users_roles', 'select, insert, delete, update') THEN 1 ELSE 0 END;
SELECT 1/CASE WHEN has_table_privilege(:'emapic_db_user', 'metadata.surveys', 'select, insert, delete, update') THEN 1 ELSE 0 END;
SELECT 1/CASE WHEN has_table_privilege(:'emapic_db_user', 'metadata.questions', 'select, insert, delete, update') THEN 1 ELSE 0 END;
SELECT 1/CASE WHEN has_table_privilege(:'emapic_db_user', 'metadata.answers', 'select, insert, delete, update') THEN 1 ELSE 0 END;
SELECT 1/CASE WHEN has_table_privilege(:'emapic_db_user', 'metadata.emapic_opinions', 'select, insert, delete, update') THEN 1 ELSE 0 END;
SELECT 1/CASE WHEN has_table_privilege(:'emapic_db_user', 'metadata.geolocation_distances', 'select, insert, delete, update') THEN 1 ELSE 0 END;
SELECT 1/CASE WHEN has_table_privilege(:'emapic_db_user', 'metadata.votes', 'select, insert, delete, update') THEN 1 ELSE 0 END;

ROLLBACK;
