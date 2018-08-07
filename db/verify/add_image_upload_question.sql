-- Verify emapic:add_image_upload_question on pg

BEGIN;

    SELECT 'image-upload'::question_type;

ROLLBACK;
