-- Revert emapic:add_oza_cesuras_munic_code from pg

BEGIN;

    UPDATE base_layers.municipalities SET codigo = null WHERE name = 'Oza-Cesuras' AND codigo = '15902';

COMMIT;
