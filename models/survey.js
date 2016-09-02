var Promise = require('bluebird'),
    searchEngineLang = require('nconf').get('app').searchEngineLang,
    fsp = require('fs-promise'),
    path = require('path');

module.exports = function(sequelize, DataTypes) {
    var Survey = sequelize.define('Survey', {
        id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
        title: { type: DataTypes.STRING, allowNull: false },
        description: DataTypes.STRING,
        welcome_text: DataTypes.STRING,
        end_text: DataTypes.STRING,
        tags: DataTypes.STRING,
        active: DataTypes.BOOLEAN,
        expires: DataTypes.DATE,
        start_date: DataTypes.DATE,
        results_after_vote: DataTypes.BOOLEAN,
        public_results: DataTypes.BOOLEAN,
        dont_list: DataTypes.BOOLEAN,
        multiple_answer: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
        anonymized: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
        language: DataTypes.STRING,
        date_created: {type: DataTypes.DATE, defaultValue: sequelize.fn('now') },
        date_opened: DataTypes.DATE,
        date_closed: DataTypes.DATE,
        public_statistics: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        nr_votes: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        already_opened: {
            // We need this virtual field because mustache cannot do comparisons
            // and therefore can't differentiate between null and false.
            type: DataTypes.VIRTUAL,
            get: function() {
                return this.active !== null;
            }
        },
        encr_id: {
            // Survey id "encrypted" in a different number base.
            type: DataTypes.VIRTUAL,
            get: function() {
                return encryptSurveyId(this.id);
            }
        },
        description_or_title: {
            // If the survey has a description, we return it. Otherwise,
            // we return the title.
            type: DataTypes.VIRTUAL,
            get: function() {
                return (this.description !== null && this.description.length > 0) ? this.description : this.title;
            }
        },
        tags_array: {
            // Virtual commodity field for retrieving an array of tags
            // instead of a string
            type: DataTypes.VIRTUAL,
            get: function() {
                if (!this.tags) {
                    return null;
                }
                // We remove the starting and ending commas and split by
                // the remaining ones
                return this.tags.replace(/^,/, '').replace(/,$/, '').split(',');
            }
        },
        tags_string: {
            // Virtual commodity field for retrieving a string of tags
            // properly separated by commas
            type: DataTypes.VIRTUAL,
            get: function() {
                if (!this.tags) {
                    return null;
                }
                // We remove the starting and ending commas and put a
                // space after the rest
                return this.tags.replace(/^,/, '').replace(/,$/, '').replace(/,/g, ', ');
            }
        }
    }, {
        scopes: {
            alreadyOpened: {
                where: {
                    active: {
                        $ne: null
                    }
                }
            },
            public: {
                where: {
                    active: {
                        $ne: null
                    },
                    dont_list: false
                }
            },
            publicSearch: function(query) {
                return {
                    where: ['active IS NOT NULL AND dont_list = false AND (' + models.Survey.getSearchVector() + " @@ plainto_tsquery(?, ?))", searchEngineLang, query],
                    order: [[{raw: ['ts_rank(' + models.Survey.getSearchVector() + ', plainto_tsquery(\'' + searchEngineLang + '\', ' + sequelize.getQueryInterface().escape(query) + '))']}, 'DESC'], ['active', 'DESC'], ['date_opened', 'DESC']]
                };
            },
            filterByTag: function(tag) {
                return {
                    where: {
                        tags: {
                            $like: '%,' + tag + ',%'
                        }
                    }
                };
            },
            filterByOwner: function(userId) {
                return {
                    where: {
                        owner_id: userId
                    }
                };
            }
        },
        classMethods: {
            associate: function(models) {
                // Scope must be added here because models.Vote must be already defined
                Survey.addScope('includeVotes', {
                    include: [models.Vote]
                });
                Survey.addScope('includeAuthor', {
                    include: [{model: models.User, as: 'owner'}]
                });
                Survey.belongsTo(models.User, {as: 'owner', foreignKey: 'owner_id'});
                models.User.hasMany(Survey, {foreignKey: 'owner_id'});
            },

            createFromPost: function(req) {
                var survey,
                    tags;
                if (req.body.survey_tags && req.body.survey_tags.trim().length > 0) {
                    tags = req.body.survey_tags.substring(0, 150).trim();
                    var indivTags = tags.split(','),
                    indivTagsClean = [];
                    for (var i = 0, iLen = indivTags.length; i<iLen; i++) {
                        if (indivTags[i].trim().length > 0) {
                            indivTagsClean.push(indivTags[i].trim());
                        }
                    }
                    tags = (indivTagsClean.length > 0 ? ',' + indivTagsClean.join(',') + ',' : null);
                } else {
                    tags = null;
                }
                return Survey.create({
                    owner_id : req.user.id,
                    title : (req.body.survey_title ? req.body.survey_title.substring(0, 150).trim() : null),
                    description : (req.body.survey_description ? req.body.survey_description.substring(0, 500).trim() : null),
                    tags : tags,
                    welcome_text : 'Bienvenido',
                    multiple_answer : ('multiple_answer' in req.body),
                    public_results : ('public_results' in req.body),
                    dont_list : ('dont_list' in req.body),
                    results_after_vote : true,
                    end_text : 'Adiós',
                    active : ('open_now' in req.body) ? true : null
                }).then(function(surv) {
                    survey = surv;
                    // We create the survey questions + answers
                    return models.Question.createFromPost(req, survey);
                }).then(function(questions) {
                    // We create the survey specific table and triggers
                    return survey.createTable();
                }).then(function() {
                    // We return the new survey
                    return survey;
                });
            },

            updateFromPost: function(req) {
                var survey,
                    oldQuestions,
                    tags;
                if (req.body.survey_tags && req.body.survey_tags.trim().length > 0) {
                    tags = req.body.survey_tags.substring(0, 150).trim();
                    var indivTags = tags.split(','),
                    indivTagsClean = [];
                    for (var i = 0, iLen = indivTags.length; i<iLen; i++) {
                        if (indivTags[i].trim().length > 0) {
                            indivTagsClean.push(indivTags[i].trim());
                        }
                    }
                    tags = (indivTagsClean.length > 0 ? ',' + indivTagsClean.join(',') + ',' : null);
                } else {
                    tags = null;
                }
                return Survey.findById(req.body.survey_id).then(function(surv) {
                    survey = surv;
                    survey.title = (req.body.survey_title ? req.body.survey_title.substring(0, 150).trim() : null);
                    survey.description = (req.body.survey_description ? req.body.survey_description.substring(0, 500).trim() : null);
                    survey.tags = tags;
                    survey.multiple_answer = ('multiple_answer' in req.body);
                    survey.public_results = ('public_results' in req.body);
                    survey.dont_list = ('dont_list' in req.body);
                    survey.results_after_vote = true;
                    survey.active = ('open_now' in req.body) ? true : null;
                    return survey.save();
                }).then(function(survey) {
                    return models.Question.updateFromPost(req, survey);
                }).then(function() {
                    // We drop the survey previous specific table and triggers
                    // and create their new versions
                    return survey.recreateTable();
                });
            },

            saveEmapicOpinion: function(req) {
                var body = req.body;
                if ((body.emapic_experience_comments && body.emapic_experience_comments !== 'null') ||
                (body.emapic_experience_final_position_reason && body.emapic_experience_final_position_reason !== 'null') ||
                (body.emapic_experience_geolocation_result && body.emapic_experience_geolocation_result !== 'null')) {
                    var strquery = 'INSERT INTO metadata.emapic_opinions (browser_os, geolocation_result, final_position_reason, comments, geom, "timestamp", accuracy) VALUES (?, ?, ?, ?, ST_SetSRID(ST_MakePoint(?, ?), 4326), now(), ?)';
                    return sequelize.query(strquery, {
                        replacements: [body.browser_os, body.emapic_experience_geolocation_result, body.emapic_experience_final_position_reason, body.emapic_experience_comments, body.lng, body.lat, body.precision],
                        type: sequelize.QueryTypes.INSERT
                    });
                } else {
                    return Promise.resolve(null);
                }
            },

            saveGeolocationDistance: function(req) {
                var body = req.body;
                if (body.lat0 !== null && body.lat0 !== 'null' &&
                body.lng0 !== null && body.lng0 !== 'null') {
                    var strquery = "INSERT INTO metadata.geolocation_distances (browser_os, distance, accuracy) VALUES (?, ST_Distance(ST_GeogFromText('SRID=4326;POINT(' || ? || ' ' || ? || ')'), ST_GeogFromText('SRID=4326;POINT(' || ? || ' ' || ? || ')')), ?)";
                    return sequelize.query(strquery, {
                        replacements: [body.browser_os, body.lng0, body.lat0, body.lng, body.lat, body.precision],
                        type: sequelize.QueryTypes.INSERT
                    });
                } else {
                    return Promise.resolve(null);
                }
            },

            getSearchVector: function() {
                return 'tsv';
            },

            generateThumbnails: function() {
                return Promise.map(models.Survey.scope('alreadyOpened').findAll({where: {nr_votes: {gte: 5}}}), function(survey) {
                    var encrId = survey.encr_id;
                    // TODO resize the snapshots from the optimal size (512x288 / 512x512) to the smaller possible sizes (256x144 / 400x400)
                    return Promise.all([
                        takeSnapshot('http://localhost:3001/survey/' + encrId + '/results',
                            'thumbnails' + path.sep + 'survey' + path.sep + 'small' + path.sep + encrId + '.png', 512, 288, 30000, 20000),
                        takeSnapshot('http://localhost:3001/survey/' + encrId + '/results',
                            'thumbnails' + path.sep + 'survey' + path.sep + 'share' + path.sep + encrId + '.png', 400, 400, 40000, 30000)
                    ]);
                // If we take snapshots with multiple sizes, we should lower the concurrency
                }, {concurrency: 3});
            }
        },
        instanceMethods: {
            clone: function(userid) {
                var originalSurvey = this,
                    newSurvey,
                    props = extractProperties(originalSurvey, ['id', 'nr_votes', 'date_created', 'date_opened', 'date_closed', 'active']);
                    props.owner_id = userid;
                    props.title = props.title + ' (copy)';
                return Promise.join(Survey.create(props), originalSurvey.getQuestions({
                    scope: 'includeAnswers'
                }), function(survey, questions) {
                    newSurvey = survey;
                    return Promise.map(questions, function(question) {
                        return question.clone(newSurvey.id);
                    });
                }).then(function(questions) {
                    // We create the survey specific table and triggers
                    return newSurvey.createTable();
                }).then(function() {
                    return newSurvey;
                });
            },

            createTable: function() {
                var survey = this;
                return this.getQuestions().then(function(questions) {
                    // We create the survey specific table
                    var questionsSql = "";
                    for (var i = 0, iLen = questions.length; i<iLen; i++) {
                        var ddl = questions[i].getDdlSql();
                        questionsSql += ((ddl !== '') ? ", " : "") + ddl;
                    }
                    return sequelize.query('CREATE TABLE opinions.survey_' + survey.id + '(gid bigserial NOT NULL PRIMARY KEY' + questionsSql + ', geom GEOMETRY(Point, 4326), "precision" integer, province_gid integer REFERENCES base_layers.provinces (gid) MATCH SIMPLE ON UPDATE NO ACTION ON DELETE NO ACTION, "timestamp" timestamp without time zone, usr_id bigint' + (survey.multiple_answer ? '' : ' UNIQUE') + ' REFERENCES users (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE SET NULL);');
                }).spread(function(results, metadata) {
                    // We create the trigger for assigning provinces
                    return sequelize.query('CREATE TRIGGER assign_province_trigger BEFORE INSERT OR UPDATE ON opinions.survey_' + survey.id + ' FOR EACH ROW EXECUTE PROCEDURE assign_province();');
                });
            },

            dropTable: function() {
                return sequelize.query('DROP TABLE IF EXISTS opinions.survey_' + this.id + ';');
            },

            recreateTable: function() {
                var survey = this;
                return Promise.join(survey.dropTable(), survey.clearAuxVotes(), function() {
                    return survey.createTable();
                });
            },

            clearAuxVotes: function() {
                return Promise.map(this.getVotes(), function(vote) {
                    return vote.destroy();
                });
            },

            clearTable: function() {
                return sequelize.query('DELETE FROM opinions.survey_' + this.id + ';');
            },

            clearVotes: function() {
                return Promise.all([this.clearTable(), this.clearAuxVotes()]);
            },

            deleteThumbnails: function() {
                var encrId = this.encr_id;
                var paths = ['thumbnails/survey/small/' + encrId + '.png', 'thumbnails/survey/share/' + encrId + '.png'];
                return Promise.map(paths, function(path) {
                    return fsp.stat(path).catch(function(error) {
                        // We ignore the error when file doesn't exist
                    }).then(function(stats) {
                        if (stats && stats.isFile()) {
                            return fsp.unlink(path);
                        }
                    });
                });
            },

            getSubTitle: function() {
                // The subTitle should serve as a description of the survey question(s)
                return this.getQuestions().then(function(questions) {
                    // As of now we only return it if the survey has only one question
                    if (questions.length != 1) {
                        return null;
                    } else {
                        return questions[0].question;
                    }
                });
            },

            getHtml: function() {
                return Promise.map(this.getQuestions({
                    scope: 'includeAnswers'
                }), function(question) {
                    return question.getHtml();
                }).then(function(results){
                    if (results.length == 1) {
                        return results[0];
                    }
                    return '<div class="questions-block">' +
                        results.join('</div><div class="questions-block" hidden>') +
                        '</div>';
                });
            },

            saveResponse: function(req) {
                var survey = this,
                    date = new Date(),
                    dateUtc = date.toISOString().replace(/T/, ' ').replace(/Z/, '');
                return Promise.join(this.getOwner(), this.getQuestions(), function(owner, questions) {
                    var usr_id = (req.user) ? parseInt(req.user.id) : null;
                    // If the survey is closed, or it's a draft and the
                    // vote doesn't come from its owner, we reject the vote
                    if (survey.active === false || (survey.active === null && usr_id != owner.id)) {
                        return Promise.reject();
                    }
                    // If the survey is a draft, then its owner's votes are stored as anonymous
                    usr_id = (survey.active === null && usr_id == owner.id) ? null : usr_id;
                    var body = req.body;
                    // If there is an emapic opinion, we save it
                    // We don't need it for anything, so we don't even handle
                    // its promise.
                    Survey.saveEmapicOpinion(req);
                    // If geolocation was used, we save the distance between
                    // the original position and the selected one.
                    // We don't need it for anything, so we don't even handle
                    // its promise.
                    Survey.saveGeolocationDistance(req);

                    var insert_query1 = 'INSERT INTO opinions.survey_' + survey.id + ' (usr_id, precision, timestamp, geom',
                    insert_query2 = ') VALUES (?, ?, ?, ST_SetSRID(ST_MakePoint(?, ?), 4326)',
                    insert_params = [usr_id, body.precision, dateUtc, body.lng, body.lat];
                    for (var i = 0, iLen = questions.length; i<iLen; i++) {
                        var vars = questions[i].getInsertSql(body.responses);
                        insert_query1 += (vars[0] !== '' ? ', ' : '') + vars[0];
                        insert_query2 += (vars[1] !== '' ? ', ' : '') + vars[1];
                        insert_params = insert_params.concat(vars[2]);
                    }
                    insert_query1 += insert_query2 + ');';

                    return sequelize.query(insert_query1,
                        { replacements: insert_params, type: sequelize.QueryTypes.INSERT }
                    ).then(function() {
                        return models.Vote.create({
                            user_id : usr_id,
                            survey_id : survey.id,
                            vote_date : date
                        });
                    });
                });
            },

            getUserResponseDates: function(userId) {
                return this.getVotes({
                    where: {
                        'user_id': userId
                    },
                    order: 'vote_date DESC'
                }).then(function(votes) {
                    var dates = [];
                    for (var i = 0, iLen = votes.length; i<iLen; i++) {
                        dates.push(votes[i].vote_date);
                    }
                    return dates;
                });
            },

            getUserNrResponses: function(userId) {
                return this.countVotes({
                    where: {
                        'user_id': userId
                    }
                });
            },

            getUserFullResponses: function(userId) {
                var surv = this;
                var id = this.id;
                return this.getQuestions().then(function(questions) {
                    var questions_fields = '';
                    for (var i = 0, iLen = questions.length; i<iLen; i++) {
                        var select = questions[i].getSelectSql();
                        questions_fields += ((select !== '') ? ',' : '') + select;
                    }
                    return sequelize.query("SELECT (extract(epoch from a.timestamp) * 1000)::bigint as timestamp, st_asgeojson(a.geom) as geojson, a.usr_id, b.login" + questions_fields + " FROM opinions.survey_" + id + " a LEFT JOIN users b ON a.usr_id = b.id WHERE usr_id = ? LIMIT 1;", {
                        replacements: [userId],
                        type: sequelize.QueryTypes.SELECT
                    }).then(function(responses) {
                        // If the user has a response, then we return it
                        if (responses.length > 0) {
                            return postGISQueryToFeatureCollection(responses).features[0];
                        } else {
                        // If not, then we return an empty template with the questions structure
                            var structure = {};
                            for (var i = 0, iLen = questions.length; i<iLen; i++) {
                                structure['q' + questions[i].question_order] = null;
                            }
                            return {
                                type: 'Feature',
                                geometry: {
                                    type: 'Point',
                                    coordinates: null
                                },
                                properties: structure
                            };
                        }
                    });
                });
            },

            getFullResponses: function() {
                var id = this.id;
                return this.getQuestions().then(function(questions) {
                    var questions_fields = '';
                    for (var i = 0, iLen = questions.length; i<iLen; i++) {
                        var select = questions[i].getSelectSql();
                        questions_fields += ((select !== '') ? ',' : '') + select;
                    }
                    return sequelize.query("SELECT (extract(epoch from a.timestamp) * 1000)::bigint as timestamp, st_y(a.geom) as lat, st_x(a.geom) as lon, d.name as country, d.iso_code_2 as country_iso, c.name as province, st_asgeojson(a.geom) as geojson, a.usr_id, b.login" + questions_fields + " FROM opinions.survey_" + id + " a LEFT JOIN users b ON a.usr_id = b.id LEFT JOIN base_layers.provinces c ON c.gid = a.province_gid LEFT JOIN base_layers.countries d ON c.country_gid = d.gid ORDER BY timestamp",
                        { type: sequelize.QueryTypes.SELECT }
                    );
                });
            },

            getResponses: function() {
                var id = this.id;
                return this.getQuestions().then(function(questions) {
                    var questions_fields = '';
                    for (var i = 0, iLen = questions.length; i<iLen; i++) {
                        var select = questions[i].getSelectSql();
                        questions_fields += ((select !== '') ? ',' : '') + select;
                    }
                    return sequelize.query("SELECT (extract(epoch from a.timestamp) * 1000)::bigint as timestamp, st_asgeojson(a.geom) as geojson, a.usr_id, b.login" + questions_fields + " FROM opinions.survey_" + id + " a LEFT JOIN users b ON a.usr_id = b.id ORDER BY timestamp",
                        { type: sequelize.QueryTypes.SELECT }
                    );
                });
            },

            getAnonymizedResponses: function() {
                var id = this.id;
                return this.getQuestions().then(function(questions) {
                    var questions_fields = '';
                    for (var i = 0, iLen = questions.length; i<iLen; i++) {
                        var select = questions[i].getSelectSql();
                        questions_fields += ((select !== '') ? ',' : '') + select;
                    }
                    return sequelize.query("SELECT (extract(epoch from a.timestamp) * 1000)::bigint as timestamp, st_asgeojson(a.geom) as geojson" + questions_fields + " FROM opinions.survey_" + id + " a ORDER BY timestamp",
                        { type: sequelize.QueryTypes.SELECT }
                    );
                });
            },

            getTotals: function() {
                var survey = this;
                return this.getLegend().then(function(legend) {
                    if (!legend.color) {
                        return Promise.resolve(null);
                    }
                    var query = "SELECT count(*) AS total_responses";
                    for (var i in legend.color.responses) {
                        query += ", (SELECT count(*) FROM opinions.survey_" + survey.id + " WHERE " + legend.color.question + "::text = '" + i + "'::text) AS \"" + i + "\"";
                    }
                    query += " FROM opinions.survey_" + survey.id + ";";
                    return sequelize.query(query, { type: sequelize.QueryTypes.SELECT });
                }).then(function(results) {
                    if (results === null) {
                        return Promise.resolve(results);
                    }
                    return Promise.resolve(results[0]);
                });
            },

            getProvinceTotals: function() {
                var survey = this;
                return this.getLegend().then(function(legend) {
                    var query = "SELECT gns_adm1 AS country_id, iso_3166_2 AS iso_code, adm1_code as adm_code, a.name, type_en AS adm_type, lower(iso_a2) AS country_iso_code, st_asgeojson(a.geom) as geojson, count(b.gid) AS total_responses";
                    if (legend && legend.color) {
                        for (var i = 0, iLen = legend.color.length; i<iLen; i++) {
                            var legendResponses = legend.color[i].responses_array;
                            for (var j = 0, jLen = legendResponses.length; j<jLen; j++) {
                                query += ", count(CASE WHEN b." + legend.color[i].question + "::text = '" + legendResponses[j].id + "'::text THEN 1 ELSE NULL::integer END) AS \"" + legend.color[i].question + "_" + legendResponses[j].id + "\"";
                            }
                        }
                    }
                    query += " FROM base_layers.provinces a JOIN opinions.survey_" + survey.id + " b ON a.gid = b.province_gid GROUP BY country_id, iso_code, adm_code, a.name, adm_type, country_iso_code, geojson ORDER BY total_responses DESC, a.name ASC;";
                    return sequelize.query(query, { type: sequelize.QueryTypes.SELECT });
                });
            },

            getProvinceTotalsBbox: function() {
                var survey = this;
                return this.getLegend().then(function(legend) {
                    var query = "SELECT gns_adm1 AS country_id, iso_3166_2 AS iso_code, adm1_code as adm_code, a.name, type_en AS adm_type, lower(iso_a2) AS country_iso_code, st_asgeojson(st_envelope(a.geom)) as geojson, count(b.gid) AS total_responses";
                    if (legend && legend.color) {
                        for (var i = 0, iLen = legend.color.length; i<iLen; i++) {
                            var legendResponses = legend.color[i].responses_array;
                            for (var j = 0, jLen = legendResponses.length; j<jLen; j++) {
                                query += ", count(CASE WHEN b." + legend.color[i].question + "::text = '" + legendResponses[j].id + "'::text THEN 1 ELSE NULL::integer END) AS \"" + legend.color[i].question + "_" + legendResponses[j].id + "\"";
                            }
                        }
                    }
                    query += " FROM base_layers.provinces a JOIN opinions.survey_" + survey.id + " b ON a.gid = b.province_gid GROUP BY country_id, iso_code, adm_code, a.name, adm_type, country_iso_code, geojson ORDER BY total_responses DESC, a.name ASC;";
                    return sequelize.query(query, { type: sequelize.QueryTypes.SELECT });
                });
            },

            getProvinceTotalsNoGeom: function() {
                var survey = this;
                return this.getLegend().then(function(legend) {
                    var query = "SELECT gns_adm1 AS country_id, iso_3166_2 AS iso_code, adm1_code as adm_code, a.name, type_en AS adm_type, lower(iso_a2) AS country_iso_code, count(b.gid) AS total_responses";
                    if (legend && legend.color) {
                        for (var i = 0, iLen = legend.color.length; i<iLen; i++) {
                            var legendResponses = legend.color[i].responses_array;
                            for (var j = 0, jLen = legendResponses.length; j<jLen; j++) {
                                query += ", count(CASE WHEN b." + legend.color[i].question + "::text = '" + legendResponses[j].id + "'::text THEN 1 ELSE NULL::integer END) AS \"" + legend.color[i].question + "_" + legendResponses[j].id + "\"";
                            }
                        }
                    }
                    query += " FROM base_layers.provinces a JOIN opinions.survey_" + survey.id + " b ON a.gid = b.province_gid GROUP BY country_id, iso_code, adm_code, a.name, adm_type, country_iso_code ORDER BY total_responses DESC, a.name ASC;";
                    return sequelize.query(query, { type: sequelize.QueryTypes.SELECT });
                });
            },

            getCountryTotals: function() {
                var survey = this;
                return this.getLegend().then(function(legend) {
                    var query = "SELECT lower(a.iso_code_2) AS iso_code, a.name, st_asgeojson(a.geom) as geojson, count(c.gid) AS total_responses";
                    if (legend && legend.color) {
                        for (var i = 0, iLen = legend.color.length; i<iLen; i++) {
                            var legendResponses = legend.color[i].responses_array;
                            for (var j = 0, jLen = legendResponses.length; j<jLen; j++) {
                                query += ", count(CASE WHEN c." + legend.color[i].question + "::text = '" + legendResponses[j].id + "'::text THEN 1 ELSE NULL::integer END) AS \"" + legend.color[i].question + "_" + legendResponses[j].id + "\"";
                            }
                        }
                    }
                    query += " FROM base_layers.countries a JOIN base_layers.provinces b ON a.gid = b.country_gid JOIN opinions.survey_" + survey.id + " c ON b.gid = c.province_gid GROUP BY iso_code, a.name, geojson ORDER BY total_responses DESC, iso_code ASC;";
                    return sequelize.query(query, { type: sequelize.QueryTypes.SELECT });
                });
            },

            getCountryTotalsBbox: function() {
                var survey = this;
                return this.getLegend().then(function(legend) {
                    var query = "SELECT lower(a.iso_code_2) AS iso_code, a.name, st_asgeojson(st_envelope(a.geom)) as geojson, count(c.gid) AS total_responses";
                    if (legend && legend.color) {
                        for (var i = 0, iLen = legend.color.length; i<iLen; i++) {
                            var legendResponses = legend.color[i].responses_array;
                            for (var j = 0, jLen = legendResponses.length; j<jLen; j++) {
                                query += ", count(CASE WHEN c." + legend.color[i].question + "::text = '" + legendResponses[j].id + "'::text THEN 1 ELSE NULL::integer END) AS \"" + legend.color[i].question + "_" + legendResponses[j].id + "\"";
                            }
                        }
                    }
                    query += " FROM base_layers.countries a JOIN base_layers.provinces b ON a.gid = b.country_gid JOIN opinions.survey_" + survey.id + " c ON b.gid = c.province_gid GROUP BY iso_code, a.name, geojson ORDER BY total_responses DESC, iso_code ASC;";
                    return sequelize.query(query, { type: sequelize.QueryTypes.SELECT });
                });
            },

            getCountryTotalsNoGeom: function() {
                var survey = this;
                return this.getLegend().then(function(legend) {
                    var query = "SELECT lower(a.iso_code_2) AS iso_code, a.name, count(c.gid) AS total_responses";
                    if (legend && legend.color) {
                        for (var i = 0, iLen = legend.color.length; i<iLen; i++) {
                            var legendResponses = legend.color[i].responses_array;
                            for (var j = 0, jLen = legendResponses.length; j<jLen; j++) {
                                query += ", count(CASE WHEN c." + legend.color[i].question + "::text = '" + legendResponses[j].id + "'::text THEN 1 ELSE NULL::integer END) AS \"" + legend.color[i].question + "_" + legendResponses[j].id + "\"";
                            }
                        }
                    }
                    query += " FROM base_layers.countries a JOIN base_layers.provinces b ON a.gid = b.country_gid JOIN opinions.survey_" + survey.id + " c ON b.gid = c.province_gid GROUP BY iso_code, a.name ORDER BY total_responses DESC, iso_code ASC;";
                    return sequelize.query(query, { type: sequelize.QueryTypes.SELECT });
                });
            },

            getLegend: function() {
                return this.getQuestions({
                    scope: 'includeAnswers'
                }).then(function(questions) {
                    var legend = {},
                        question;
                    for (var i = 0, iLen = questions.length; i<iLen; i++) {
                        question = questions[i];
                        if (question.legend_question) {
                            if (typeof legend[question.legend_question] === 'undefined') {
                                legend[question.legend_question] = [];
                            }
                            var sublegend = {};
                            // We return a map, which is most useful for direct translation
                            sublegend.question = 'q' + question.question_order;
                            sublegend.text = question.question;

                            sublegend.responses = {};
                            for (var j = 0, jLen = question.Answers.length; j<jLen; j++) {
                                if (question.Answers[j].legend !== null) {
                                    sublegend.responses[question.Answers[j].sortorder.toString()] = {
                                        legend: question.Answers[j].legend,
                                        value: question.Answers[j].answer
                                    };
                                }
                            }

                            // We also return an array, which may be most useful where answers' order is important
                            sublegend.responses_array = [];
                            // Some answers are special and should always be in last place
                            var lastAnswers = [];
                            for (var k = 0, kLen = question.Answers.length; k<kLen; k++) {
                                if (question.Answers[k].legend !== null) {
                                    if (question.Answers[k].sortorder == -1) {
                                        lastAnswers.push({
                                            id: question.Answers[k].sortorder.toString(),
                                            value: question.Answers[k].answer,
                                            legend: question.Answers[k].legend
                                        });
                                    } else {
                                        sublegend.responses_array.push({
                                            id: question.Answers[k].sortorder.toString(),
                                            value: question.Answers[k].answer,
                                            legend: question.Answers[k].legend
                                        });
                                    }
                                }
                            }
                            sublegend.responses_array = sublegend.responses_array.concat(lastAnswers);
                            legend[question.legend_question].push(sublegend);
                        }
                    }
                    return legend;
                });
            }
        },
        hooks: {
            beforeDestroy: function(survey) {
                return Promise.join(survey.dropTable(), survey.deleteThumbnails());
            }
        },
        tableName: 'surveys',
        schema: 'metadata'
    });

    return Survey;
};
