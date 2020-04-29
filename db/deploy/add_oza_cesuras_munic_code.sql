-- Deploy emapic:add_oza_cesuras_munic_code to pg
-- requires: base_layers

BEGIN;

    UPDATE base_layers.municipalities SET codigo = '15902' WHERE name = 'Oza-Cesuras' AND codigo IS NULL;

COMMIT;
