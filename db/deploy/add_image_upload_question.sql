-- Deploy emapic:add_image_upload_question to pg
-- requires: emapic_tables

ALTER TYPE question_type ADD VALUE 'image-upload';
