-- Revert emapic:api_fields from pg

BEGIN;

ALTER TABLE public.users DROP COLUMN api_id;
ALTER TABLE public.users DROP COLUMN api_secret;

COMMIT;
