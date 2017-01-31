-- Deploy emapic:add_image_url_question to pg
-- requires: emapic_tables

ALTER TYPE question_type ADD VALUE 'image-url';
