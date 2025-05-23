-- Revert emapic:add_image_upload_question from pg

BEGIN;

    CREATE OR REPLACE FUNCTION remove_upload_image_refs()
    RETURNS VOID AS
    $$
    DECLARE
        surv_id bigint;
    BEGIN
        DELETE FROM metadata.votes WHERE survey_id IN (SELECT DISTINCT survey_id FROM metadata.questions WHERE type = 'image-upload');
        DELETE FROM metadata.answers WHERE question_id IN (SELECT id FROM metadata.questions WHERE survey_id IN (SELECT DISTINCT survey_id FROM metadata.questions WHERE type = 'image-upload'));
        FOR surv_id IN SELECT DISTINCT survey_id FROM metadata.questions WHERE type = 'image-upload'
        LOOP
            EXECUTE 'DROP TABLE opinions.survey_' || surv_id::varchar;
            DELETE FROM metadata.questions WHERE survey_id = surv_id;
            DELETE FROM metadata.surveys WHERE id = surv_id;
        END LOOP;
    END;
    $$
    LANGUAGE 'plpgsql';

    SELECT remove_upload_image_refs();

    DROP FUNCTION remove_upload_image_refs();

    CREATE TYPE question_type_revert AS ENUM ('text-answer', 'yes-no', 'list-radio', 'list-radio-other', 'explanatory-text', 'image-url');

    ALTER TABLE metadata.questions ALTER COLUMN type TYPE question_type_revert USING (type::text::question_type_revert);

    DROP TYPE question_type;

    ALTER TYPE question_type_revert RENAME TO question_type;

COMMIT;
