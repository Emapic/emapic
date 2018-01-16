-- Deploy emapic:fix_roles_relationship to pg
-- requires: emapic_tables

BEGIN;

    ALTER TABLE rel_users_roles DROP CONSTRAINT rel_users_roles_role_id_fkey;

    ALTER TABLE rel_users_roles ADD CONSTRAINT rel_users_roles_role_id_fkey FOREIGN KEY (role_id)
        REFERENCES roles (id) MATCH SIMPLE
        ON UPDATE CASCADE ON DELETE CASCADE;

    ALTER TABLE rel_users_roles DROP CONSTRAINT rel_users_roles_user_id_fkey;

    ALTER TABLE rel_users_roles ADD CONSTRAINT rel_users_roles_user_id_fkey FOREIGN KEY (user_id)
        REFERENCES users (id) MATCH SIMPLE
        ON UPDATE CASCADE ON DELETE CASCADE;

COMMIT;
