-- Deploy emapic:fix_assign_municipality to pg
-- requires: link_answers_and_municipalities

BEGIN;

    CREATE OR REPLACE FUNCTION assign_municipality()
        RETURNS trigger AS
      $BODY$
      DECLARE
          new_municipality int;
          new_municipality_dist real;
      BEGIN
          IF (TG_OP = 'INSERT') THEN
              IF (new.province_gid IS NOT NULL) THEN
                  SELECT gid INTO new_municipality FROM base_layers.municipalities WHERE province_gid = new.province_gid ORDER BY st_distance(geom, new.geom) ASC LIMIT 1;
                  IF (new_municipality IS NOT NULL) THEN
                      SELECT st_distance_sphere(geom, new.geom) INTO new_municipality_dist FROM base_layers.municipalities WHERE gid = new_municipality;
                      IF (new_municipality_dist <= 22200) THEN
                          new.municipality_gid = new_municipality;
                      ELSE
                          new.municipality_gid = null;
                      END IF;
                  END IF;
              ELSE
                  new.municipality_gid = null;
              END IF;
              RETURN new;
          END IF;
          IF (TG_OP = 'UPDATE') THEN
              IF (new.province_gid IS NOT NULL) THEN
                  SELECT gid INTO new_municipality FROM base_layers.municipalities WHERE province_gid = new.province_gid ORDER BY st_distance(geom, new.geom) ASC LIMIT 1;
                  IF (new_municipality IS NOT NULL) THEN
                      SELECT st_distance_sphere(geom, new.geom) INTO new_municipality_dist FROM base_layers.municipalities WHERE gid = new_municipality;
                      IF (new_municipality_dist <= 22200) THEN
                          new.municipality_gid = new_municipality;
                      ELSE
                          new.municipality_gid = null;
                      END IF;
                  END IF;
              END IF;
              RETURN new;
          END IF;
          RETURN old;
      END;
      $BODY$
        LANGUAGE plpgsql VOLATILE;

    CREATE FUNCTION update_surveys_municipality()
    RETURNS VOID AS
      $BODY$
      DECLARE
          survey RECORD;
          survey_exists BOOLEAN;
      BEGIN
        FOR survey IN SELECT * FROM metadata.surveys ORDER BY id LOOP

    		SELECT EXISTS (
    		   SELECT 1
    		   FROM   information_schema.tables
    		   WHERE  table_schema = 'opinions'
    		   AND    table_name = 'survey_' || survey.id
    	    ) INTO survey_exists;

    		IF survey_exists THEN
                EXECUTE 'UPDATE opinions.survey_' || survey.id || ' SET gid = gid;';
    		ELSE
    			RAISE WARNING '%', 'SURVEY ' || survey.id || ' DOESN''T SEEM TO HAVE AN ANSWERS TABLE. IGNORING...';
    		END IF;

        END LOOP;
      END;
      $BODY$
        LANGUAGE plpgsql VOLATILE;

    SELECT update_surveys_municipality();

    DROP FUNCTION update_surveys_municipality();

    CREATE OR REPLACE FUNCTION assign_municipality()
        RETURNS trigger AS
      $BODY$
      DECLARE
          new_municipality int;
          new_municipality_dist real;
      BEGIN
          IF (TG_OP = 'INSERT') THEN
              IF (new.province_gid IS NOT NULL) THEN
                  SELECT gid INTO new_municipality FROM base_layers.municipalities WHERE province_gid = new.province_gid ORDER BY st_distance(geom, new.geom) ASC LIMIT 1;
                  IF (new_municipality IS NOT NULL) THEN
                      SELECT st_distance_sphere(geom, new.geom) INTO new_municipality_dist FROM base_layers.municipalities WHERE gid = new_municipality;
                      IF (new_municipality_dist <= 22200) THEN
                          new.municipality_gid = new_municipality;
                      ELSE
                          new.municipality_gid = null;
                      END IF;
                  END IF;
              ELSE
                  new.municipality_gid = null;
              END IF;
              RETURN new;
          END IF;
          IF (TG_OP = 'UPDATE') THEN
              IF (new.province_gid IS NOT NULL AND ((old.geom IS NULL) OR NOT (old.geom = new.geom))) THEN
                  SELECT gid INTO new_municipality FROM base_layers.municipalities WHERE province_gid = new.province_gid ORDER BY st_distance(geom, new.geom) ASC LIMIT 1;
                  IF (new_municipality IS NOT NULL) THEN
                      SELECT st_distance_sphere(geom, new.geom) INTO new_municipality_dist FROM base_layers.municipalities WHERE gid = new_municipality;
                      IF (new_municipality_dist <= 22200) THEN
                          new.municipality_gid = new_municipality;
                      ELSE
                          new.municipality_gid = null;
                      END IF;
                  END IF;
              END IF;
              RETURN new;
          END IF;
          RETURN old;
      END;
      $BODY$
        LANGUAGE plpgsql VOLATILE;

COMMIT;
