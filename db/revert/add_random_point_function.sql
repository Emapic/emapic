-- Revert emapic:add_random_point_function from pg

BEGIN;

    DROP FUNCTION public.randompoint(geometry, int);

COMMIT;
