-- Deploy emapic:extensions to pg

BEGIN;

CREATE EXTENSION IF NOT EXISTS postgis;

CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE TEXT SEARCH CONFIGURATION es ( COPY = spanish );
ALTER TEXT SEARCH CONFIGURATION es
       ALTER MAPPING FOR hword, hword_part, word
       WITH unaccent, spanish_stem;

COMMIT;
