-- Revert emapic:link_answers_and_municipalities from pg

BEGIN;

    CREATE FUNCTION update_surveys_remove_municipality()
    RETURNS VOID AS
    $BODY$
    DECLARE
      survey RECORD;
      survey_exists BOOLEAN;
    BEGIN
    FOR survey IN SELECT * FROM metadata.surveys ORDER BY id LOOP

        SELECT EXISTS (
           SELECT 1
           FROM   information_schema.tables
           WHERE  table_schema = 'opinions'
           AND    table_name = 'survey_' || survey.id
        ) INTO survey_exists;

        IF survey_exists THEN
            EXECUTE 'DROP TRIGGER IF EXISTS b_assign_municipality_trigger
                ON opinions.survey_' || survey.id;

            EXECUTE 'ALTER TRIGGER a_assign_province_trigger
            	ON opinions.survey_' || survey.id || ' RENAME TO assign_province_trigger';

            EXECUTE 'ALTER TABLE opinions.survey_' || survey.id || ' DROP COLUMN IF EXISTS municipality_gid';
        ELSE
            RAISE WARNING '%', 'SURVEY ' || survey.id || ' DOESN''T SEEM TO HAVE AN ANSWERS TABLE. IGNORING...';
        END IF;

    END LOOP;
    END;
    $BODY$
    LANGUAGE plpgsql VOLATILE;

    SELECT update_surveys_remove_municipality();

    DROP FUNCTION update_surveys_remove_municipality();

COMMIT;
