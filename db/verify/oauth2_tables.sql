-- Verify emapic:oauth2_tables on pg

BEGIN;

    SELECT 1/CASE WHEN has_table_privilege(:'emapic_db_user', 'oauth2.access_tokens', 'select, insert, update, delete') THEN 1 ELSE 0 END;
    SELECT 1/CASE WHEN has_table_privilege(:'emapic_db_user', 'oauth2.clients', 'select, insert, update, delete') THEN 1 ELSE 0 END;
    SELECT 1/CASE WHEN has_table_privilege(:'emapic_db_user', 'oauth2.refresh_tokens', 'select, insert, update, delete') THEN 1 ELSE 0 END;

ROLLBACK;
