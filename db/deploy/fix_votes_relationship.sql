-- Deploy emapic:fix_votes_relationship to pg
-- requires: emapic_tables

BEGIN;

ALTER TABLE metadata.votes
    DROP CONSTRAINT votes_user_id_fkey;

ALTER TABLE metadata.votes
    ADD CONSTRAINT votes_user_id_fkey FOREIGN KEY (user_id)
    REFERENCES public.users (id) MATCH SIMPLE
    ON UPDATE CASCADE
    ON DELETE SET NULL;

COMMIT;
