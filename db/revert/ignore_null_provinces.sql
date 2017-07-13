-- Revert emapic:ignore_null_provinces from pg

BEGIN;

    CREATE OR REPLACE FUNCTION assign_province()
      RETURNS trigger AS
    $BODY$
    DECLARE
        new_province int;
        new_province_dist real;
    BEGIN
        IF (TG_OP = 'INSERT') THEN
            SELECT gid INTO new_province FROM base_layers.provinces ORDER BY st_distance(geom, new.geom) ASC LIMIT 1;
            SELECT st_distance_sphere(geom, new.geom) INTO new_province_dist FROM base_layers.provinces WHERE gid = new_province;
            IF (new_province_dist <= 22200) THEN
                new.province_gid = new_province;
            ELSE
                new.province_gid = null;
            END IF;
            RETURN new;
        END IF;
        IF (TG_OP = 'UPDATE') THEN
            IF (old.geom IS NULL) OR NOT (old.geom = new.geom) THEN
                SELECT gid INTO new_province FROM base_layers.provinces ORDER BY st_distance(geom, new.geom) ASC LIMIT 1;
                SELECT st_distance_sphere(geom, new.geom) INTO new_province_dist FROM base_layers.provinces WHERE gid = new_province;
                IF (new_province_dist <= 22200) THEN
                    new.province_gid = new_province;
                ELSE
                    new.province_gid = null;
                END IF;
                RETURN new;
            END IF;
            RETURN new;
        END IF;
        RETURN old;
    END;
    $BODY$
      LANGUAGE plpgsql VOLATILE;

COMMIT;
