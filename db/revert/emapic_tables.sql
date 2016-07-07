-- Revert emapic:emapic_tables from pg

BEGIN;

DROP TRIGGER update_tsv ON metadata.surveys;

DROP FUNCTION metadata.update_tsv();

DROP FUNCTION assign_municipality();

DROP FUNCTION assign_province();

DROP SCHEMA opinions CASCADE;

DROP TRIGGER update_vote_count ON metadata.votes;

DROP FUNCTION metadata.update_vote_count();

DROP TABLE metadata.votes;

DROP TABLE metadata.geolocation_distances;

DROP TABLE metadata.emapic_opinions;

DROP TABLE metadata.answers;

DROP TABLE metadata.questions;

DROP TYPE question_type;

DROP TABLE metadata.surveys;

DROP SCHEMA metadata;

DROP TABLE rel_users_roles;

DROP TABLE roles;

DROP TABLE users;

DROP TYPE gender;

COMMIT;
