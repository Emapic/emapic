-- Deploy emapic:emapic_db_user to pg
-- requires: emapic_tables

BEGIN;

CREATE USER :"emapic_db_user" WITH PASSWORD :'emapic_db_user_pass';

GRANT USAGE ON SCHEMA base_layers TO :"emapic_db_user";

GRANT SELECT ON ALL TABLES IN SCHEMA base_layers TO :"emapic_db_user";

GRANT ALL ON SCHEMA opinions TO :"emapic_db_user";

GRANT USAGE ON SCHEMA public TO :"emapic_db_user";

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO :"emapic_db_user";

GRANT SELECT, USAGE ON ALL SEQUENCES IN SCHEMA public TO :"emapic_db_user";

GRANT USAGE ON SCHEMA metadata TO :"emapic_db_user";

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA metadata TO :"emapic_db_user";

GRANT SELECT, USAGE ON ALL SEQUENCES IN SCHEMA metadata TO :"emapic_db_user";

COMMIT;
