/* This file includes an example of how to simplify a layer while retaining
   its topology using the PostGIS topology module (available in PostGIS >= 2.0).
   By simply executing this SQL file as it is you should have a new column in
   base_layers.country, simp_geom, with the simplified geometries.

	Based mostly on a blo entry by strk https://strk.kbt.io/blog/2012/04/13/simplifying-a-map-layer-using-postgis-topology/ */

/* First we load the topology extension (required only once per database) */
CREATE EXTENSION postgis_topology;

/* We define the function which we'll use for simplifying the geoms.
	Based on a function by strk */
CREATE OR REPLACE FUNCTION public.simplifyedgegeom(
    atopo character varying,
    anedge integer,
    maxtolerance double precision)
  RETURNS double precision AS
$BODY$
DECLARE
  tol float8;
  sql varchar;
BEGIN
  tol := maxtolerance;
  LOOP
    sql := 'SELECT topology.ST_ChangeEdgeGeom(' || quote_literal(atopo) || ', ' || anedge
      || ', ST_SimplifyPreserveTopology(geom, ' || tol || ')) FROM '
      || quote_ident(atopo) || '.edge WHERE edge_id = ' || anedge;
    BEGIN
      RAISE DEBUG 'Running %', sql;
      EXECUTE sql;
      RETURN tol;
    EXCEPTION
     WHEN OTHERS THEN
      --RAISE WARNING 'Simplification of edge % with tolerance % failed: %', anedge, tol, SQLERRM;
      tol := round( (tol/2.0) * 1e8 ) / 1e8; -- round to get to zero quicker
      IF tol = 0 THEN RAISE EXCEPTION '%', SQLERRM; END IF;
    END;
  END LOOP;
END
$BODY$
  LANGUAGE plpgsql STABLE STRICT
  COST 100;

/* If we have already defined a topology for this layer, we delete it. */
-- SELECT DropTopoGeometryColumn('base_layers', 'countries', 'topogeom');
-- SELECT DropTopology('countries_topo');

/* We create the topology, add the topogeom column and compute its data. 
	NOTE: 1e-6 is the tolerance (in srid units) for snapping elements while creating the topology.
	See http://postgis.net/docs/manual-2.0/CreateTopology.html */
SELECT CreateTopology('countries_topo', find_srid('base_layers', 'countries', 'geom'), 1e-6);
SELECT AddTopoGeometryColumn('countries_topo', 'base_layers', 'countries', 'topogeom', 'MULTIPOLYGON');
UPDATE base_layers.countries SET topogeom = toTopoGeom(geom, 'countries_topo', 1);

/* Simplify the geometries with the previously defined function, create a new geometry column and
   cast the resulting topogeometry to geometry into that column.
	NOTE: 0.02 is the tolerance (in srid units) for the simplification algorithm (Douglas-Peucker).
	See http://postgis.net/docs/manual-2.0/ST_SimplifyPreserveTopology.html */
SELECT SimplifyEdgeGeom('countries_topo', edge_id, 0.02) FROM countries_topo.edge;
ALTER TABLE base_layers.countries ADD COLUMN simp_geom geometry(MultiPolygon, 4326);
UPDATE base_layers.countries SET simp_geom = topogeom::geometry;
