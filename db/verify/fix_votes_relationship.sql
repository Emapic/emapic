-- Verify emapic:vfix_votes_relationship on pg

BEGIN;

    SELECT 1/count(*) FROM pg_catalog.pg_constraint WHERE conname = 'votes_user_id_fkey' AND confdeltype = 'n';

ROLLBACK;
