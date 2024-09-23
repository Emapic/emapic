-- Verify emapic:add_latest_vote on pg

BEGIN;

	SELECT 1 / CASE WHEN has_column_privilege(:'emapic_db_user', 'metadata.surveys', 'latest_vote', 'select, insert, update') THEN 1 ELSE 0 END;

ROLLBACK;
