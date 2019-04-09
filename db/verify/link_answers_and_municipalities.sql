-- Verify emapic:link_answers_and_municipalities on pg

BEGIN;

    CREATE FUNCTION verify_surveys_have_municipality()
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
            EXECUTE 'SELECT municipality_gid FROM opinions.survey_' || survey.id || ' LIMIT 0;';
        END IF;

    END LOOP;
    END;
    $BODY$
    LANGUAGE plpgsql VOLATILE;

    SELECT verify_surveys_have_municipality();

    DROP FUNCTION verify_surveys_have_municipality();

ROLLBACK;
