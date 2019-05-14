-- Verify emapic:add_long_text_question on pg

BEGIN;

    SELECT 'long-text-answer'::question_type;

ROLLBACK;
