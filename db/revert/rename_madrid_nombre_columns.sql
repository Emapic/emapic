-- Revert emapic:rename_madrid_nombre_columns from pg

BEGIN;

    ALTER TABLE base_layers.madrid_distritos RENAME COLUMN name TO nombre;
    ALTER TABLE base_layers.madrid_barrios RENAME COLUMN name TO nombre;

COMMIT;
