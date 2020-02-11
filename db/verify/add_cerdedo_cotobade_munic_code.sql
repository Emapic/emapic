-- Verify emapic:add_cerdedo_cotobade_munic_code on pg

BEGIN;

    SELECT 1 / (CASE WHEN codigo = '36902' THEN 1 ELSE 0 END) FROM base_layers.municipalities WHERE name = 'Cerdedo-Cotobade';

ROLLBACK;
