-- Deploy emapic:create_files_table to pg
-- requires: emapic_tables

BEGIN;

    CREATE TABLE metadata.files (
        id SERIAL PRIMARY KEY,
        path VARCHAR NOT NULL UNIQUE,
        original_filename VARCHAR NOT NULL,
        mime_type VARCHAR,
        date_created DATE DEFAULT now()
    );

    GRANT SELECT, INSERT, UPDATE, DELETE, REFERENCES ON metadata.files TO :"emapic_db_user";

    GRANT SELECT, USAGE ON SEQUENCE metadata.files_id_seq TO :"emapic_db_user";

COMMIT;
