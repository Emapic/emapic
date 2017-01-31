-- Verify emapic:add_image_url_question on pg

BEGIN;

    SELECT 'image-url'::question_type;

ROLLBACK;
