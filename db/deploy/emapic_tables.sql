-- Deploy emapic:emapic_tables to pg
-- requires: base_layers

BEGIN;

CREATE TYPE GENDER AS ENUM ('f', 'm', 'x');

CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR NOT NULL UNIQUE,
    login VARCHAR NOT NULL UNIQUE,
    google_id VARCHAR UNIQUE,
    google_token VARCHAR,
    facebook_id VARCHAR UNIQUE,
    facebook_token VARCHAR,
    url VARCHAR,
    avatar BYTEA,
    password VARCHAR,
    salt VARCHAR,
    activated BOOLEAN DEFAULT FALSE,
    name VARCHAR,
    sex GENDER,
    birthdate DATE,
    country VARCHAR,
    province VARCHAR,
    postal_address VARCHAR,
    city VARCHAR,
    address VARCHAR,
    locale VARCHAR,
    join_date DATE DEFAULT now(),
    geom GEOMETRY(Point, 4326)
);

CREATE TABLE roles (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR NOT NULL UNIQUE
);

CREATE TABLE rel_users_roles (
    user_id BIGINT REFERENCES users(id),
    role_id BIGINT REFERENCES roles(id),
    PRIMARY KEY (user_id, role_id)
);

CREATE SCHEMA metadata;

CREATE TABLE metadata.surveys (
    id BIGSERIAL PRIMARY KEY,
    owner_id INTEGER NOT NULL REFERENCES users(id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    title VARCHAR NOT NULL,
    description TEXT,
    welcome_text TEXT,
    end_text TEXT,
    tags VARCHAR,
    active BOOL,
    expires TIMESTAMP,
    start_date TIMESTAMP,
    multiple_answer BOOL NOT NULL DEFAULT FALSE,
    anonymized BOOL NOT NULL DEFAULT FALSE,
    public_results BOOL NOT NULL DEFAULT FALSE,
    results_after_vote BOOL NOT NULL DEFAULT TRUE,
    dont_list BOOL NOT NULL DEFAULT FALSE,
    language VARCHAR(50),
    date_created TIMESTAMP DEFAULT now(),
    date_opened TIMESTAMP,
    date_closed TIMESTAMP,
    public_statistics BOOL NOT NULL DEFAULT TRUE,
    nr_votes INTEGER NOT NULL DEFAULT 0,
    tsv TSVECTOR
);

CREATE TYPE question_type AS ENUM ('text-answer', 'yes-no', 'list-radio', 'list-radio-other', 'explanatory-text');

CREATE TABLE metadata.questions (
    id BIGSERIAL PRIMARY KEY,
    survey_id INTEGER NOT NULL REFERENCES metadata.surveys(id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    type question_type NOT NULL,
    title VARCHAR(20) NOT NULL DEFAULT ''::VARCHAR,
    question TEXT NOT NULL,
    mandatory BOOL NOT NULL DEFAULT TRUE,
    question_order INTEGER NOT NULL,
    legend_question VARCHAR,
    language VARCHAR(20) NOT NULL DEFAULT 'es'::VARCHAR,
    CONSTRAINT unique_question_language UNIQUE(survey_id, question_order, language)
);

CREATE TABLE metadata.answers (
    id BIGSERIAL PRIMARY KEY,
    question_id INTEGER NOT NULL REFERENCES metadata.questions(id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    answer TEXT NOT NULL,
    sortorder INT NOT NULL,
    legend VARCHAR,
    img BYTEA,
    language VARCHAR(20) NOT NULL DEFAULT 'es'::VARCHAR,
    CONSTRAINT unique_question_answer_language UNIQUE(question_id, sortorder, language)
);

CREATE TABLE metadata.emapic_opinions (
    gid SERIAL NOT NULL PRIMARY KEY,
    browser_os VARCHAR,
    geolocation_result VARCHAR,
    final_position_reason VARCHAR,
    comments VARCHAR,
    geom GEOMETRY(Point, 4326),
    "timestamp" TIMESTAMP WITHOUT TIME ZONE,
    accuracy REAL
);

CREATE TABLE metadata.geolocation_distances (
    gid SERIAL NOT NULL PRIMARY KEY,
    browser_os VARCHAR,
    distance REAL,
    accuracy REAL
);

CREATE TABLE metadata.votes (
    gid SERIAL NOT NULL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    survey_id BIGINT NOT NULL REFERENCES metadata.surveys(id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    vote_date TIMESTAMP WITHOUT TIME ZONE NOT NULL
);

CREATE OR REPLACE FUNCTION metadata.update_vote_count() RETURNS TRIGGER AS $update_vote_count$
    BEGIN
        IF (TG_OP = 'DELETE') THEN
            UPDATE metadata.surveys SET nr_votes = nr_votes - 1 WHERE id = OLD.survey_id AND nr_votes > 0;
        ELSIF (TG_OP = 'UPDATE') THEN
            IF (NEW.survey_id != OLD.survey_id) THEN
                UPDATE metadata.surveys SET nr_votes = nr_votes - 1 WHERE id = OLD.survey_id AND nr_votes > 0;
                UPDATE metadata.surveys SET nr_votes = nr_votes + 1 WHERE id = NEW.survey_id;
            END IF;
        ELSIF (TG_OP = 'INSERT') THEN
            UPDATE metadata.surveys SET nr_votes = nr_votes + 1 WHERE id = NEW.survey_id;
        END IF;
        RETURN NULL; -- result is ignored since this is an AFTER trigger
    END;
$update_vote_count$ LANGUAGE plpgsql;

CREATE TRIGGER update_vote_count
AFTER INSERT OR UPDATE OR DELETE ON metadata.votes
    FOR EACH ROW EXECUTE PROCEDURE metadata.update_vote_count();

CREATE SCHEMA opinions;

CREATE OR REPLACE FUNCTION assign_province()
  RETURNS trigger AS
$BODY$
DECLARE
    new_province int;
    new_province_dist real;
BEGIN
    IF (TG_OP = 'INSERT') THEN
        SELECT gid INTO new_province FROM base_layers.provinces ORDER BY st_distance(geom, new.geom) ASC LIMIT 1;
        SELECT st_distance_sphere(geom, new.geom) INTO new_province_dist FROM base_layers.provinces WHERE gid = new_province;
        IF (new_province_dist <= 22200) THEN
            new.province_gid = new_province;
        ELSE
            new.province_gid = null;
        END IF;
        RETURN new;
    END IF;
    IF (TG_OP = 'UPDATE') THEN
        IF (old.geom IS NULL) OR NOT (old.geom = new.geom) THEN
            SELECT gid INTO new_province FROM base_layers.provinces ORDER BY st_distance(geom, new.geom) ASC LIMIT 1;
            SELECT st_distance_sphere(geom, new.geom) INTO new_province_dist FROM base_layers.provinces WHERE gid = new_province;
            IF (new_province_dist <= 22200) THEN
                new.province_gid = new_province;
            ELSE
                new.province_gid = null;
            END IF;
            RETURN new;
        END IF;
        RETURN new;
    END IF;
    RETURN old;
END;
$BODY$
  LANGUAGE plpgsql VOLATILE;

CREATE OR REPLACE FUNCTION assign_municipality()
    RETURNS trigger AS
  $BODY$
  DECLARE
      new_municipality int;
      new_municipality_dist real;
  BEGIN
      IF (TG_OP = 'INSERT') THEN
          IF (new.province_gid IS NOT NULL) THEN
              SELECT gid INTO new_municipality FROM base_layers.municipalities WHERE province_gid = new.province_gid ORDER BY st_distance(geom, new.geom) ASC LIMIT 1;
              IF (new_municipality IS NOT NULL) THEN
                  SELECT st_distance_sphere(geom, new.geom) INTO new_municipality_dist FROM base_layers.municipalities WHERE gid = new_municipality;
                  IF (new_municipality_dist <= 22200) THEN
                      new.municipality_gid = new_municipality;
                  ELSE
                      new.municipality_gid = null;
                  END IF;
              END IF;
          ELSE
              new.municipality_gid = null;
          END IF;
          RETURN new;
      END IF;
      IF (TG_OP = 'UPDATE') THEN
          IF (new.province_gid IS NOT NULL AND ((old.geom IS NULL) OR NOT (old.geom = new.geom))) THEN
              SELECT gid INTO new_municipality FROM base_layers.municipalities WHERE province_gid = new.province_gid ORDER BY st_distance(geom, new.geom) ASC LIMIT 1;
              IF (new_municipality IS NOT NULL) THEN
                  SELECT st_distance_sphere(geom, new.geom) INTO new_municipality_dist FROM base_layers.municipalities WHERE gid = new_municipality;
                  IF (new_municipality_dist <= 22200) THEN
                      new.municipality_gid = new_municipality;
                  ELSE
                      new.municipality_gid = null;
                  END IF;
              END IF;
          ELSE
              new.municipality_gid = null;
          END IF;
          RETURN new;
      END IF;
      RETURN old;
  END;
  $BODY$
    LANGUAGE plpgsql VOLATILE;

CREATE OR REPLACE FUNCTION metadata.update_tsv() RETURNS TRIGGER AS $update_tsv$
    BEGIN
        NEW.tsv := to_tsvector('es', coalesce(NEW.title, '') || ' ' || coalesce(NEW.description, '') || ' ' || coalesce(NEW.tags, ''));
        RETURN NEW;
    END;
$update_tsv$ LANGUAGE plpgsql;

CREATE TRIGGER update_tsv
BEFORE INSERT OR UPDATE ON metadata.surveys
    FOR EACH ROW EXECUTE PROCEDURE metadata.update_tsv();

COMMIT;
