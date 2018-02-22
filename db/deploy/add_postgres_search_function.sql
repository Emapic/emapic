-- Deploy emapic:add_postgres_search_function to pg
-- requires: emapic_tables

BEGIN;

    CREATE OR REPLACE FUNCTION ts_match(a TSVECTOR, b TSQUERY) RETURNS BOOLEAN AS $$
        BEGIN
            RETURN a @@ b;
        END;
        $$ LANGUAGE plpgsql;

COMMIT;
