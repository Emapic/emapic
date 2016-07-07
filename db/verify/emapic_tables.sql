-- Verify emapic:emapic_tables on pg

BEGIN;

SELECT 0/count(*) FROM pg_type WHERE typname = 'gender';
SELECT has_table_privilege('users', 'select');
SELECT has_table_privilege('roles', 'select');
SELECT has_table_privilege('rel_users_roles', 'select');
SELECT has_table_privilege('metadata.surveys', 'select');
SELECT 0/count(*) FROM pg_type WHERE typname = 'question_type';
SELECT has_table_privilege('metadata.questions', 'select');
SELECT has_table_privilege('metadata.answers', 'select');
SELECT has_table_privilege('metadata.emapic_opinions', 'select');
SELECT has_table_privilege('metadata.geolocation_distances', 'select');
SELECT has_table_privilege('metadata.votes', 'select');
SELECT has_function_privilege('metadata.update_vote_count()', 'execute');
SELECT 0/count(*) FROM pg_trigger a JOIN pg_class b ON a.tgrelid=b.oid JOIN pg_namespace c ON b.relnamespace=c.oid WHERE a.tgname = 'update_vote_count' AND b.relname = 'votes' AND c.nspname = 'metadata';
SELECT has_schema_privilege('opinions', 'usage');
SELECT has_function_privilege('assign_province()', 'execute');
SELECT has_function_privilege('assign_municipality()', 'execute');
SELECT has_function_privilege('metadata.update_tsv()', 'execute');
SELECT 0/count(*) FROM pg_trigger a JOIN pg_class b ON a.tgrelid=b.oid JOIN pg_namespace c ON b.relnamespace=c.oid WHERE a.tgname = 'update_tsv' AND b.relname = 'surveys' AND c.nspname = 'metadata';

ROLLBACK;
