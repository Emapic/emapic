-- Verify emapic:add_test_api_user on pg

BEGIN;

    SELECT 0/count(*) FROM users WHERE email = 'test@test.test';

ROLLBACK;
