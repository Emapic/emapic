-- Verify emapic:emapic_tables on pg

BEGIN;

SELECT 0/count(*) FROM pg_type WHERE typname = 'gender';
SELECT 1/CASE WHEN has_table_privilege('users', 'select') THEN 1 ELSE 0 END;
SELECT 1/CASE WHEN has_table_privilege('roles', 'select') THEN 1 ELSE 0 END;
SELECT 1/CASE WHEN has_table_privilege('rel_users_roles', 'select') THEN 1 ELSE 0 END;
SELECT 1/CASE WHEN has_table_privilege('metadata.surveys', 'select') THEN 1 ELSE 0 END;
SELECT 0/count(*) FROM pg_type WHERE typname = 'question_type';
SELECT 1/CASE WHEN has_table_privilege('metadata.questions', 'select') THEN 1 ELSE 0 END;
SELECT 1/CASE WHEN has_table_privilege('metadata.answers', 'select') THEN 1 ELSE 0 END;
SELECT 1/CASE WHEN has_table_privilege('metadata.emapic_opinions', 'select') THEN 1 ELSE 0 END;
SELECT 1/CASE WHEN has_table_privilege('metadata.geolocation_distances', 'select') THEN 1 ELSE 0 END;
SELECT 1/CASE WHEN has_table_privilege('metadata.votes', 'select') THEN 1 ELSE 0 END;
SELECT 1/CASE WHEN has_function_privilege('metadata.update_vote_count()', 'execute') THEN 1 ELSE 0 END;
SELECT 0/count(*) FROM pg_trigger a JOIN pg_class b ON a.tgrelid=b.oid JOIN pg_namespace c ON b.relnamespace=c.oid WHERE a.tgname = 'update_vote_count' AND b.relname = 'votes' AND c.nspname = 'metadata';
SELECT 1/CASE WHEN has_schema_privilege('opinions', 'usage') THEN 1 ELSE 0 END;
SELECT 1/CASE WHEN has_function_privilege('assign_province()', 'execute') THEN 1 ELSE 0 END;
SELECT 1/CASE WHEN has_function_privilege('assign_municipality()', 'execute') THEN 1 ELSE 0 END;
SELECT 1/CASE WHEN has_function_privilege('metadata.update_tsv()', 'execute') THEN 1 ELSE 0 END;
SELECT 0/count(*) FROM pg_trigger a JOIN pg_class b ON a.tgrelid=b.oid JOIN pg_namespace c ON b.relnamespace=c.oid WHERE a.tgname = 'update_tsv' AND b.relname = 'surveys' AND c.nspname = 'metadata';

ROLLBACK;
