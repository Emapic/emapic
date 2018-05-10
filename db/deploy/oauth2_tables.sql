-- Deploy emapic:oauth2_tables to pg
-- requires: emapic_db_user
-- requires: emapic_tables

BEGIN;

    CREATE SCHEMA oauth2;

    CREATE TABLE oauth2.clients (
        id BIGSERIAL PRIMARY KEY,
        client_id VARCHAR NOT NULL UNIQUE,
        client_secret VARCHAR NOT NULL,
        grants VARCHAR NOT NULL
    );

    CREATE TABLE oauth2.access_tokens (
        id BIGSERIAL PRIMARY KEY,
        token VARCHAR NOT NULL UNIQUE,
        expiration_date TIMESTAMP,
        client_id INT REFERENCES oauth2.clients(id),
        user_id INT REFERENCES users(id)
    );

    CREATE TABLE oauth2.refresh_tokens (
        id BIGSERIAL PRIMARY KEY,
        token VARCHAR NOT NULL UNIQUE,
        expiration_date TIMESTAMP,
        client_id INT REFERENCES oauth2.clients(id),
        user_id INT REFERENCES users(id)
    );

    GRANT USAGE ON SCHEMA oauth2 TO :"emapic_db_user";

    GRANT SELECT, INSERT, UPDATE, DELETE, REFERENCES ON ALL TABLES IN SCHEMA oauth2 TO :"emapic_db_user";

    GRANT USAGE ON ALL SEQUENCES IN SCHEMA oauth2 TO :"emapic_db_user";

COMMIT;
