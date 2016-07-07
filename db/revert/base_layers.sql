-- Revert emapic:base_layers from pg

BEGIN;

DROP TABLE IF EXISTS base_layers.municipalities;

DROP TABLE IF EXISTS base_layers.provinces;

DROP TABLE IF EXISTS base_layers.countries;

DROP SCHEMA IF EXISTS base_layers CASCADE;

COMMIT;
