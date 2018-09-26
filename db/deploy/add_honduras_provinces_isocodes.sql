-- Deploy emapic:add_honduras_provinces_isocodes to pg
-- requires: base_layers

BEGIN;

    UPDATE base_layers.provinces SET iso_3166_2 = 'HN-AT' WHERE postal = 'AT' AND iso_a2 = 'HN';
    UPDATE base_layers.provinces SET iso_3166_2 = 'HN-CL' WHERE postal = 'CL' AND iso_a2 = 'HN';
    UPDATE base_layers.provinces SET iso_3166_2 = 'HN-CM' WHERE postal = 'CM' AND iso_a2 = 'HN';
    UPDATE base_layers.provinces SET iso_3166_2 = 'HN-CP' WHERE postal = 'CP' AND iso_a2 = 'HN';
    UPDATE base_layers.provinces SET iso_3166_2 = 'HN-CR' WHERE postal = 'CR' AND iso_a2 = 'HN';
    UPDATE base_layers.provinces SET iso_3166_2 = 'HN-CH' WHERE postal = 'CH' AND iso_a2 = 'HN';
    UPDATE base_layers.provinces SET iso_3166_2 = 'HN-EP' WHERE postal = 'EP' AND iso_a2 = 'HN';
    UPDATE base_layers.provinces SET iso_3166_2 = 'HN-FM' WHERE postal = 'FM' AND iso_a2 = 'HN';
    UPDATE base_layers.provinces SET iso_3166_2 = 'HN-GD' WHERE postal = 'GD' AND iso_a2 = 'HN';
    UPDATE base_layers.provinces SET iso_3166_2 = 'HN-IN' WHERE postal = 'IN' AND iso_a2 = 'HN';
    UPDATE base_layers.provinces SET iso_3166_2 = 'HN-IB' WHERE postal = 'IB' AND iso_a2 = 'HN';
    UPDATE base_layers.provinces SET iso_3166_2 = 'HN-LP' WHERE postal = 'LP' AND iso_a2 = 'HN';
    UPDATE base_layers.provinces SET iso_3166_2 = 'HN-LM' WHERE postal = 'LE' AND iso_a2 = 'HN';
    UPDATE base_layers.provinces SET iso_3166_2 = 'HN-OC' WHERE postal = 'OC' AND iso_a2 = 'HN';
    UPDATE base_layers.provinces SET iso_3166_2 = 'HN-OL' WHERE postal = 'OL' AND iso_a2 = 'HN';
    UPDATE base_layers.provinces SET iso_3166_2 = 'HN-SB' WHERE postal = 'SB' AND iso_a2 = 'HN';
    UPDATE base_layers.provinces SET iso_3166_2 = 'HN-VL' WHERE postal = 'VA' AND iso_a2 = 'HN';
    UPDATE base_layers.provinces SET iso_3166_2 = 'HN-YO' WHERE postal = 'YO' AND iso_a2 = 'HN';

COMMIT;
