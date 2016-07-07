-- Revert emapic:emapic_db_user from pg

BEGIN;

DROP OWNED BY :"emapic_db_user";

DROP USER IF EXISTS :"emapic_db_user";

COMMIT;
