-- Deploy emapic:add_cerdedo_cotobade_munic_code to pg
-- requires: base_layers

BEGIN;

    UPDATE base_layers.municipalities SET codigo = '36902' WHERE name = 'Cerdedo-Cotobade' AND codigo IS NULL;

COMMIT;
