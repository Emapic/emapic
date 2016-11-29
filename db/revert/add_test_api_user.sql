-- Revert emapic:add_test_api_user from pg

BEGIN;

    DELETE FROM public.users WHERE email = 'test@test.test';

COMMIT;
