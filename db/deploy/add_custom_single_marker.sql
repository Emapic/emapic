-- Deploy emapic:add_custom_single_marker to pg
-- requires: emapic_tables

BEGIN;

    ALTER TABLE metadata.surveys ADD COLUMN custom_single_marker_file_id BIGINT REFERENCES metadata.files ON UPDATE CASCADE ON DELETE SET NULL;

COMMIT;
