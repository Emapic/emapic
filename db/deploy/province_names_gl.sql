-- Deploy emapic:province_names_gl to pg
-- requires: base_layers

BEGIN;

	ALTER TABLE base_layers.provinces ADD COLUMN name_gl VARCHAR(254);

    UPDATE base_layers.provinces SET name_gl = name;

    UPDATE base_layers.provinces SET name_gl = 'Áraba' WHERE gid = 1007;
    UPDATE base_layers.provinces SET name_gl = 'Alacant' WHERE gid = 1009;
    UPDATE base_layers.provinces SET name_gl = 'Badaxoz' WHERE gid = 1013;
    UPDATE base_layers.provinces SET name_gl = 'Biscaia' WHERE gid = 1056;
    UPDATE base_layers.provinces SET name_gl = 'Castelló' WHERE gid = 1020;
    UPDATE base_layers.provinces SET name_gl = 'Cidade Real' WHERE gid = 1022;
    UPDATE base_layers.provinces SET name_gl = 'A Coruña' WHERE gid = 1032;
    UPDATE base_layers.provinces SET name_gl = 'Guadalaxara' WHERE gid = 1027;
    UPDATE base_layers.provinces SET name_gl = 'Guipúscoa' WHERE gid = 1028;
    UPDATE base_layers.provinces SET name_gl = 'Lleida' WHERE gid = 1036;
    UPDATE base_layers.provinces SET name_gl = 'Ourense' WHERE gid = 1043;
    UPDATE base_layers.provinces SET name_gl = 'As Palmas' WHERE gid = 1034;
    UPDATE base_layers.provinces SET name_gl = 'A Rioxa' WHERE gid = 1033;
    UPDATE base_layers.provinces SET name_gl = 'Xaén' WHERE gid = 1031;
    UPDATE base_layers.provinces SET name_gl = 'Xirona' WHERE gid = 1025;

COMMIT;
