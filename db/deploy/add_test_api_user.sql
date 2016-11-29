-- Deploy emapic:add_test_api_user to pg

BEGIN;

    INSERT INTO public.users(email, login, password, salt, activated, name, join_date, api_id, api_secret) VALUES ('test@test.test', 'emapic', '$2a$08$t8VXvEmuRCNb2OcoEgz7JuIqFJwz3jPet4xHiPEwpRsG7DuorNxQq', 'k6TSQMUCw0xb9p0IKrKDdJU5tKKPz2po', true, 'emapic', now(), '1', '1');

COMMIT;
