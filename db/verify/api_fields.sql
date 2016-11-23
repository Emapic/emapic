-- Verify emapic:api_fields on pg

BEGIN;

	SELECT has_column_privilege(:'emapic_db_user', 'public.users', 'api_id', 'select');
  SELECT has_column_privilege(:'emapic_db_user', 'public.users', 'api_secret', 'select');

ROLLBACK;
