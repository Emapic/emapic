-- Verify emapic:add_accept_info_email on pg

BEGIN;

	SELECT has_column_privilege(:'emapic_db_user', 'public.users', 'accept_info_email', 'select');

ROLLBACK;
