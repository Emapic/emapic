-- Revert emapic:add_honduras_provinces_isocodes from pg

BEGIN;

    UPDATE base_layers.provinces SET iso_3166_2 = 'HN-' WHERE iso_a2 = 'HN';

COMMIT;
