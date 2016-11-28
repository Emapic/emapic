-- Verify emapic:add_random_point_function on pg

BEGIN;

    SELECT has_function_privilege('randompoint(geometry, integer)', 'execute');

ROLLBACK;
