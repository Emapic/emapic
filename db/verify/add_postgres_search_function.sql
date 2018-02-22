-- Verify emapic:add_postgres_search_function on pg

BEGIN;

    SELECT 1/CASE WHEN has_function_privilege('ts_match(TSVECTOR, TSQUERY)', 'execute') THEN 1 ELSE 0 END;

ROLLBACK;
