-- Verify emapic:fix_municipalities_simpl_geoms on pg

BEGIN;

	-- Not worth wasting time with lame verifying process, as previous
	-- attempt couldn't prevent huge mistake regarding the same geometries.

ROLLBACK;
