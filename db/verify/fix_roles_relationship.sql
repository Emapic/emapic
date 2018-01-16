-- Verify emapic:fix_roles_relationship on pg

BEGIN;

    SELECT 1/count(*) FROM pg_catalog.pg_constraint WHERE conname = 'rel_users_roles_role_id_fkey' AND confupdtype = 'c' AND confdeltype = 'c';

    SELECT 1/count(*) FROM pg_catalog.pg_constraint WHERE conname = 'rel_users_roles_user_id_fkey' AND confupdtype = 'c' AND confdeltype = 'c';

ROLLBACK;
