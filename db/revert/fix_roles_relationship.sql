-- Revert emapic:fix_roles_relationship from pg

BEGIN;

    ALTER TABLE rel_users_roles DROP CONSTRAINT rel_users_roles_role_id_fkey;

    ALTER TABLE rel_users_roles ADD CONSTRAINT rel_users_roles_role_id_fkey FOREIGN KEY (role_id)
        REFERENCES roles (id);

    ALTER TABLE rel_users_roles DROP CONSTRAINT rel_users_roles_user_id_fkey;

    ALTER TABLE rel_users_roles ADD CONSTRAINT rel_users_roles_user_id_fkey FOREIGN KEY (user_id)
        REFERENCES users (id);

COMMIT;
