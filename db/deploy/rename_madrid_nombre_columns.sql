-- Deploy emapic:rename_madrid_nombre_columns to pg

BEGIN;

    ALTER TABLE base_layers.madrid_distritos RENAME COLUMN nombre TO name;
    ALTER TABLE base_layers.madrid_barrios RENAME COLUMN nombre TO name;

COMMIT;
