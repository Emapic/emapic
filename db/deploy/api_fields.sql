-- Deploy emapic:api_fields to pg

BEGIN;

ALTER TABLE public.users ADD COLUMN api_id VARCHAR UNIQUE;
ALTER TABLE public.users ADD COLUMN api_secret VARCHAR;

UPDATE public.users SET api_id = id;
UPDATE public.users SET api_secret = id;

ALTER TABLE public.users ALTER COLUMN api_id SET NOT NULL;
ALTER TABLE public.users ALTER COLUMN api_secret SET NOT NULL;

COMMIT;
