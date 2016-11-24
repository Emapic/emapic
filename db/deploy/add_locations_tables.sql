-- Deploy emapic:add_locations_tables to pg

BEGIN;

    CREATE TABLE metadata.location_groups (
        id BIGSERIAL PRIMARY KEY,
        owner_id INTEGER NOT NULL REFERENCES users(id)
            ON UPDATE CASCADE ON DELETE CASCADE,
        title VARCHAR,
        active BOOLEAN,
        date_created TIMESTAMP DEFAULT now(),
        nr_votes INTEGER NOT NULL DEFAULT 0,
        external_id VARCHAR NOT NULL,
        UNIQUE(owner_id, external_id)
    );

    CREATE SCHEMA locations;

    GRANT SELECT, INSERT, UPDATE, DELETE, REFERENCES ON metadata.location_groups TO :"emapic_db_user";

    GRANT SELECT, USAGE ON metadata.location_groups_id_seq TO :"emapic_db_user";

    GRANT ALL ON SCHEMA locations TO :"emapic_db_user";

COMMIT;
