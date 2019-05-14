-- Revert emapic:add_long_text_question from pg

BEGIN;

    CREATE TYPE question_type_revert AS ENUM ('text-answer', 'yes-no', 'list-radio', 'list-radio-other', 'image-url', 'explanatory-text', 'image-upload');

    ALTER TABLE metadata.questions ALTER COLUMN type TYPE question_type_revert USING (type::text::question_type_revert);

    DROP TYPE question_type;

    ALTER TYPE question_type_revert RENAME TO question_type;

COMMIT;
