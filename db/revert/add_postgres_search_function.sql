-- Revert emapic:add_postgres_search_function from pg

BEGIN;

    DROP FUNCTION ts_match(a TSVECTOR, b TSQUERY);

COMMIT;
