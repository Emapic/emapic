-- Revert emapic:add_madrid_layers from pg

BEGIN;

	DROP FUNCTION assign_madrid_barrio() CASCADE;
    DROP table base_layers.madrid_barrios CASCADE;
    DROP table base_layers.madrid_distritos CASCADE;

COMMIT;
