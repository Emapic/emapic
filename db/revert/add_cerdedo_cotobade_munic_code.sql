-- Revert emapic:add_cerdedo_cotobade_munic_code from pg

BEGIN;

    UPDATE base_layers.municipalities SET codigo = null WHERE name = 'Cerdedo-Cotobade' AND codigo = '36902';

COMMIT;
