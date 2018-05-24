-- Revert emapic:add_accept_info_email from pg

BEGIN;

    ALTER TABLE users DROP COLUMN accept_info_email;

COMMIT;
