-- Deploy emapic:add_accept_info_email to pg
-- requires: emapic_tables

BEGIN;

    ALTER TABLE users ADD COLUMN accept_info_email BOOLEAN DEFAULT FALSE;

COMMIT;
