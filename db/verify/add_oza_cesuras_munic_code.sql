-- Verify emapic:add_oza_cesuras_munic_code on pg

BEGIN;

    SELECT 1 / (CASE WHEN codigo = '15902' THEN 1 ELSE 0 END) FROM base_layers.municipalities WHERE name = 'Oza-Cesuras';

ROLLBACK;
