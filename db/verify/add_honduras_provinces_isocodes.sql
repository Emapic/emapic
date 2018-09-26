-- Verify emapic:add_honduras_provinces_isocodes on pg

BEGIN;

    SELECT 1 / (CASE WHEN iso_3166_2 = 'HN-AT' THEN 1 ELSE 0 END) FROM base_layers.provinces WHERE postal = 'AT' AND iso_a2 = 'HN';
    SELECT 1 / (CASE WHEN iso_3166_2 = 'HN-CL' THEN 1 ELSE 0 END) FROM base_layers.provinces WHERE postal = 'CL' AND iso_a2 = 'HN';
    SELECT 1 / (CASE WHEN iso_3166_2 = 'HN-CM' THEN 1 ELSE 0 END) FROM base_layers.provinces WHERE postal = 'CM' AND iso_a2 = 'HN';
    SELECT 1 / (CASE WHEN iso_3166_2 = 'HN-CP' THEN 1 ELSE 0 END) FROM base_layers.provinces WHERE postal = 'CP' AND iso_a2 = 'HN';
    SELECT 1 / (CASE WHEN iso_3166_2 = 'HN-CR' THEN 1 ELSE 0 END) FROM base_layers.provinces WHERE postal = 'CR' AND iso_a2 = 'HN';
    SELECT 1 / (CASE WHEN iso_3166_2 = 'HN-CH' THEN 1 ELSE 0 END) FROM base_layers.provinces WHERE postal = 'CH' AND iso_a2 = 'HN';
    SELECT 1 / (CASE WHEN iso_3166_2 = 'HN-EP' THEN 1 ELSE 0 END) FROM base_layers.provinces WHERE postal = 'EP' AND iso_a2 = 'HN';
    SELECT 1 / (CASE WHEN iso_3166_2 = 'HN-FM' THEN 1 ELSE 0 END) FROM base_layers.provinces WHERE postal = 'FM' AND iso_a2 = 'HN';
    SELECT 1 / (CASE WHEN iso_3166_2 = 'HN-GD' THEN 1 ELSE 0 END) FROM base_layers.provinces WHERE postal = 'GD' AND iso_a2 = 'HN';
    SELECT 1 / (CASE WHEN iso_3166_2 = 'HN-IN' THEN 1 ELSE 0 END) FROM base_layers.provinces WHERE postal = 'IN' AND iso_a2 = 'HN';
    SELECT 1 / (CASE WHEN iso_3166_2 = 'HN-IB' THEN 1 ELSE 0 END) FROM base_layers.provinces WHERE postal = 'IB' AND iso_a2 = 'HN';
    SELECT 1 / (CASE WHEN iso_3166_2 = 'HN-LP' THEN 1 ELSE 0 END) FROM base_layers.provinces WHERE postal = 'LP' AND iso_a2 = 'HN';
    SELECT 1 / (CASE WHEN iso_3166_2 = 'HN-LM' THEN 1 ELSE 0 END) FROM base_layers.provinces WHERE postal = 'LE' AND iso_a2 = 'HN';
    SELECT 1 / (CASE WHEN iso_3166_2 = 'HN-OC' THEN 1 ELSE 0 END) FROM base_layers.provinces WHERE postal = 'OC' AND iso_a2 = 'HN';
    SELECT 1 / (CASE WHEN iso_3166_2 = 'HN-OL' THEN 1 ELSE 0 END) FROM base_layers.provinces WHERE postal = 'OL' AND iso_a2 = 'HN';
    SELECT 1 / (CASE WHEN iso_3166_2 = 'HN-SB' THEN 1 ELSE 0 END) FROM base_layers.provinces WHERE postal = 'SB' AND iso_a2 = 'HN';
    SELECT 1 / (CASE WHEN iso_3166_2 = 'HN-VL' THEN 1 ELSE 0 END) FROM base_layers.provinces WHERE postal = 'VA' AND iso_a2 = 'HN';
    SELECT 1 / (CASE WHEN iso_3166_2 = 'HN-YO' THEN 1 ELSE 0 END) FROM base_layers.provinces WHERE postal = 'YO' AND iso_a2 = 'HN';

ROLLBACK;
