-- Deploy emapic:add_long_text_question to pg
-- requires: add_image_upload_question

ALTER TYPE question_type ADD VALUE 'long-text-answer';
