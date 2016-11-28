-- Deploy emapic:add_random_point_function to pg

BEGIN;

    -- Function: public.randompoint(geometry, integer)

    -- DROP FUNCTION public.randompoint(geometry, integer);

    CREATE OR REPLACE FUNCTION public.randompoint(
        geom geometry,
        maxiter integer DEFAULT 1000)
      RETURNS geometry AS
    $BODY$
    DECLARE
            i INTEGER := 0;
            x0 DOUBLE PRECISION;
            dx DOUBLE PRECISION;
            y0 DOUBLE PRECISION;
            dy DOUBLE PRECISION;
            xp DOUBLE PRECISION;
            yp DOUBLE PRECISION;
            rpoint Geometry;
    BEGIN
            -- find envelope
            x0 = ST_XMin(geom);
            dx = (ST_XMax(geom) - x0);
            y0 = ST_YMin(geom);
            dy = (ST_YMax(geom) - y0);

            WHILE i < maxiter LOOP
                    i = i + 1;
                    xp = x0 + dx * random();
                    yp = y0 + dy * random();
                    rpoint = ST_SetSRID( ST_MakePoint( xp, yp ), ST_SRID(geom) );
                    EXIT WHEN ST_Within( rpoint, geom );
            END LOOP;

            IF i >= maxiter THEN
                    RAISE EXCEPTION 'RandomPoint: number of interations exceeded %', maxiter;
            END IF;

            RETURN rpoint;
    END;
    $BODY$
      LANGUAGE plpgsql VOLATILE
      COST 100;
    ALTER FUNCTION public.randompoint(geometry, integer)
      OWNER TO postgres;

COMMIT;
