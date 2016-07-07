-- Verify emapic:extensions on pg

BEGIN;

SELECT 0/COUNT(*) FROM pg_extension WHERE extname = 'postgis';
SELECT 0/COUNT(*) FROM pg_extension WHERE extname = 'unaccent';
SELECT 0/COUNT(*) FROM pg_ts_config WHERE cfgname = 'es';

ROLLBACK;
