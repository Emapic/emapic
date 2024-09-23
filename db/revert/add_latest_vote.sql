-- Revert emapic:add_latest_vote from pg

BEGIN;

    ALTER TABLE metadata.surveys DROP COLUMN latest_vote;

COMMIT;
