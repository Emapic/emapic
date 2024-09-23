-- Deploy emapic:add_latest_vote to pg
-- requires: emapic_tables

BEGIN;

    ALTER TABLE metadata.surveys ADD COLUMN latest_vote TIMESTAMP WITHOUT TIME ZONE;

    UPDATE metadata.surveys s SET latest_vote = (SELECT max(vote_date) FROM metadata.votes WHERE survey_id = s.id);

COMMIT;
