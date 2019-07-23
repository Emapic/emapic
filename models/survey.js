var Promise = require('bluebird'),
    nconf = require('nconf'),
    linkifyHtml = require('linkifyjs/html'),
    fsp = require('fs-extra'),
    path = require('path'),
    fs = require('fs'),
    logger = require('../utils/logger'),
    sequelize = require('sequelize'),

    searchEngineLang = nconf.get('app').searchEngineLang,
    defaultPageSize = nconf.get('app').defaultPageSize,
    answersRequestType = {
        'normal': 0,
        'full': 1,
        'anonymized': 2
    },
    sqlType = {
        'select': 0,
        'ddl': 1
    },
    thumbnailsFolder = 'thumbnails' + path.sep + 'survey';
const Op = sequelize.Op;

function trimSubstringField(field, maxLength) {
    if (maxLength !== null) {
        return (field ? field.substring(0, maxLength).trim() : null);
    }
    return (field ? field.trim() : null);
}

function parseTagsFromPost(req) {
    if (req.body.survey_tags && req.body.survey_tags.trim().length > 0) {
        tags = req.body.survey_tags.substring(0, 150).trim();
        var indivTags = tags.split(','),
        indivTagsClean = [];
        for (var i = 0, iLen = indivTags.length; i<iLen; i++) {
            if (indivTags[i].trim().length > 0) {
                indivTagsClean.push(indivTags[i].trim());
            }
        }
        return (indivTagsClean.length > 0 ? ',' + indivTagsClean.join(',') + ',' : null);
    } else {
        return null;
    }
}

function getAllFieldsSQL(qstns, type) {
    var qstnsFields = '',
        sql;
    for (var j = 0, len = qstns.length; j<len; j++) {
        switch (type) {
            case sqlType.select:
                sql = qstns[j].getSelectSql();
                break;
            case sqlType.ddl:
                sql = qstns[j].getDdlSql();
                break;
        }
        qstnsFields += ((sql !== '') ? ',' : '') + sql;
    }
    return qstnsFields;
}

function getFiltersSQL(getFilters, questions) {
    var sqls = [],
        params = {};
    if (getFilters) {
        for (var param in getFilters) {
            switch (param) {
                case 'filter_tmin':
                case 'filter_tmax':
                    if (isNaN(getFilters[param])) {
                        continue;
                    }
                    sqls.push('a.timestamp ' + (param === 'filter_tmin' ? '>=' : '<=' ) + ' TO_TIMESTAMP(:' + param + ") AT TIME ZONE 'UTC'");
                    params[param] = parseInt(getFilters[param]) / 1000; // Milliseconds to seconds
                    break;
                case 'filter_geom':
                    sqls.push('ST_Contains(ST_SetSRID(ST_GeomFromGeoJSON(:' + param + '), 4326), a.geom)');
                    params[param] = getFilters[param];
                    break;
                default:
                    if (param.startsWith('filter_q')) {
                        var q = parseInt(param.substring(8));
                        if (isNaN(q)) {
                            continue;
                        }
                        var qstnFound = false;
                        for (var i = 0, iLen = questions.length; i<iLen; i++) {
                            if (questions[i].legend_question && questions[i].question_order === q) {
                                qstnFound = true;
                                break;
                            }
                        }
                        if (!qstnFound) {
                            continue;
                        }
                        sqls.push('q' + q + ' IN (:' + param + ')');
                        params[param] = getFilters[param];
                    }
            }
        }
    }
    return {
        sql: sqls.length > 0 ? 'WHERE ' + sqls.join(' AND ') : '',
        params: params
    };
}

function getSurveyResponsesSql(survey, type, getFilters, lang) {
    var id = survey.id,
        countryNamePromise,
        provinceNamePromise,
        municipalityNamePromise;
    if (lang) {
        countryNamePromise = checkColumnExists('name_' + lang, 'countries', 'base_layers').then(function(result) {
            return result[0].exists ? 'name_' + lang : 'name';
        });
        provinceNamePromise = checkColumnExists('name_' + lang, 'provinces', 'base_layers').then(function(result) {
            return result[0].exists ? 'name_' + lang : 'name';
        });
        municipalityNamePromise = checkColumnExists('name_' + lang, 'municipalities', 'base_layers').then(function(result) {
            return result[0].exists ? 'name_' + lang : 'name';
        });
    } else {
        countryNamePromise = Promise.resolve('name');
        provinceNamePromise = Promise.resolve('name');
        municipalityNamePromise = Promise.resolve('name');
    }
    return Promise.join(survey.getQuestions({ scope: 'includeSurvey' }), countryNamePromise, provinceNamePromise, municipalityNamePromise,
      function(questions, countryName, provinceName, municipalityName) {
        var fieldsSql = getAllFieldsSQL(questions, sqlType.select),
            whereData = getFiltersSQL(getFilters, questions),
            sql;
        switch (type) {
            case answersRequestType.normal:
                sql = "SELECT (extract(epoch from a.timestamp) * 1000)::bigint as timestamp, st_asgeojson(a.geom) as geojson, a.usr_id, b.login" + fieldsSql + " FROM opinions.survey_" + id + " a LEFT JOIN users b ON a.usr_id = b.id " + whereData.sql + " ORDER BY timestamp";
                break;
            case answersRequestType.full:
                sql = "SELECT (extract(epoch from a.timestamp) * 1000)::bigint as timestamp, st_y(a.geom) as lat, st_x(a.geom) as lon, d." + countryName + " as country, d.iso_code_2 as country_iso, c." + provinceName + " as province, c.adm1_code as province_code, e." + municipalityName + " as municipality, e.codigo as municipality_code, st_asgeojson(a.geom) as geojson, a.usr_id, b.login" +
                    fieldsSql + " FROM opinions.survey_" + id + " a LEFT JOIN users b ON a.usr_id = b.id LEFT JOIN base_layers.provinces c ON c.gid = a.province_gid LEFT JOIN base_layers.countries d ON c.country_gid = d.gid LEFT JOIN base_layers.municipalities e ON e.gid = a.municipality_gid " + whereData.sql + " ORDER BY timestamp";
                break;
            case answersRequestType.anonymized:
                sql = "SELECT (extract(epoch from a.timestamp) * 1000)::bigint as timestamp, st_asgeojson(a.geom) as geojson" + fieldsSql + " FROM opinions.survey_" + id + " a LEFT JOIN base_layers.provinces b ON b.gid = a.province_gid LEFT JOIN base_layers.countries c ON b.country_gid = c.gid " + whereData.sql + " LEFT JOIN base_layers.municipalities d ON d.gid = a.municipality_gid ORDER BY c.iso_code_2, b.adm1_code, d.codigo, a.timestamp";
                break;
        }
        return {
            sql: sql,
            params: whereData.params
        };
    });
}

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
                return Utils.encryptSurveyId(this.id);
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
        description_linkified: {
            // If the survey has a description, we return it with URLs linkified
            type: DataTypes.VIRTUAL,
            get: function() {
                return (this.description !== null && this.description.length > 0) ? Utils.transformNewlinesToHtml(linkifyHtml(this.description)) : null;
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
            defaultOrdering: function() {
                return {
                    order: Utils.createOrderArray(Survey.getDefaultOrder())
                };
            },

            stateDatesOrdering: function() {
                return {
                    order: Utils.createOrderArray(Survey.getStateDatesOrder())
                };
            },

            votesOrdering: function() {
                return {
                    order: Utils.createOrderArray(Survey.getVotesOrder())
                };
            },

            popularityOrdering: function() {
                return {
                    order: Utils.createOrderArray(Survey.getPopularityOrder())
                };
            },

            ordering: function(order) {
                return {
                    order: Utils.createOrderArray(Survey.getOrder(order))
                };
            },

            alreadyOpened: {
                where: {
                    active: {
                        [Op.ne]: null
                    }
                }
            },

            public: {
                where: {
                    active: {
                        [Op.ne]: null
                    },
                    dont_list: false
                }
            },

            open: {
                where: {
                    active: true
                }
            },

            closed: {
                where: {
                    active: false
                }
            },

            draft: {
                where: {
                    active: null
                }
            },

            search: function(query, ordering) {
                var params = {
                    where:
                            sequelize.where(
                                sequelize.fn('ts_match',
                                    sequelize.col(Survey.getSearchVector()),
                                    sequelize.fn('plainto_tsquery', searchEngineLang, query)
                                ),
                                true
                            )
                    ,
                    order: [[
                        sequelize.fn('ts_rank',
                            sequelize.col(Survey.getSearchVector()),
                            sequelize.fn('plainto_tsquery', searchEngineLang, query)
                        ), 'DESC']]
                };
                var order = Survey.getOrder(ordering);
                if (ordering && ordering !== 'default') {
                    // If ordering is different than default, it takes precedence
                    for (var i = order.length - 1; i>=0; i--) {
                        params.order.unshift(order[i]);
                    }
                } else {
                    // Default ordering prioritizes search rel
                    for (var i = 0, iLen = order.length; i<iLen; i++) {
                        params.order.push(order[i]);
                    }
                }
                return params;
            },

            filterByTag: function(tag) {
                var likes = [],
                    tagSplit = tag.split(',');
                for (var i = 0, len = tagSplit.length; i<len; i++) {
                    likes.push({
                        [Op.like]: '%,' + tagSplit[i].trim() + ',%'
                    });
                }
                return {
                    where: {
                        tags: {
                            [Op.and]: likes
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
        hooks: {
            beforeDestroy: function(survey) {
                return Promise.join(survey.dropTable(), survey.deleteThumbnails());
            }
        },
        tableName: 'surveys',
        schema: 'metadata'
    });

    // Class Methods
    Survey.getDefaultOrder = function() {
        return models.Survey.getStateDatesOrder();
    };

    Survey.getStateDatesOrder = function() {
        return [['active', 'DESC NULLS FIRST'], ['date_opened', 'DESC'], ['date_created', 'DESC']];
    };

    Survey.getVotesOrder = function() {
        var order = models.Survey.getDefaultOrder();
        // First make sure draft surveys are shown the last
        order.unshift([sequelize.literal('CASE WHEN active IS NULL THEN 1 ELSE 0 END'), 'ASC'], ['nr_votes', 'DESC']);
        return order;
    };

    Survey.getPopularityOrder = function() {
        var order = models.Survey.getDefaultOrder();
        // First make sure draft surveys are shown the last
        order.unshift([sequelize.literal('CASE WHEN active IS NULL THEN 1 ELSE 0 END'), 'ASC'], [sequelize.literal('nr_votes / extract(epoch from (now() - date_opened)) ^ 1.5'), 'DESC']);
        return order;
    };

    Survey.getOrder = function(order) {
        switch(order) {
            case 'votes':
                return Survey.getVotesOrder();
            case 'popular':
                return Survey.getPopularityOrder();
            case 'dates':
                return Survey.getStateDatesOrder();
            default:
                return Survey.getDefaultOrder();
        }
    };

    Survey.associate = function(models) {
        // Scope must be added here because models.Vote must be already defined
        Survey.addScope('includeVotes', {
            include: [models.Vote]
        });
        Survey.addScope('includeAuthor', {
            include: [{model: models.User, as: 'owner'}]
        });
        Survey.belongsTo(models.User, {as: 'owner', foreignKey: 'owner_id'});
        models.User.hasMany(Survey, {foreignKey: 'owner_id'});
    };

    Survey.createFromPost = function(req) {
        var survey;
        return Survey.create({
            owner_id : req.user.id,
            title : trimSubstringField(req.body.survey_title, 150),
            description : trimSubstringField(req.body.survey_description, 500),
            tags : parseTagsFromPost(req),
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
    };

    Survey.findSurveys = function(userId, onlyPublic, status, query, tag, order, pageSize, pageNr) {
        var params = {},
            scopes = ['includeAuthor'];
        if (onlyPublic === true) {
            scopes.unshift('public');
        }
        if (status !== null && status in Survey.options.scopes) {
            scopes.unshift(status);
        }
        pageSize = pageSize === null || isNaN(pageSize) ? defaultPageSize : pageSize;
        if (pageSize !== null) {
            params.limit = pageSize;
            if (pageNr !== null) {
                params.offset = (pageNr - 1) * pageSize;
            }
        }
        if (userId !== null) {
            scopes.unshift({ method: ['filterByOwner', userId] });
        }
        if (tag !== null) {
            scopes.unshift({ method: ['filterByTag', tag] });
        }
        if (query !== null) {
            scopes.unshift({ method: ['search', query, order] });
        } else {
            scopes.unshift({ method: ['ordering', order] });
        }
        return Survey.scope(scopes).findAndCountAll(params);
    };

    Survey.findPublicSurveys = function(userId, status, query, tag, order, pageSize, pageNr) {
        if (['open', 'closed'].indexOf(status) === -1) {
            status = null;
        }
        return Survey.findSurveys(userId, true, status, query, tag, order, pageSize, pageNr);
    };

    Survey.findPublicSurveysByUserLogin = function(login, status, query, tag, order, pageSize, pageNr) {
        if (login === null) {
            return Survey.findPublicSurveys(null, status, query, tag, order, pageSize, pageNr);
        }
        return models.User.findByLogin(login).then(function(user) {
            return Survey.findPublicSurveys(user.id, status, query, tag, order, pageSize, pageNr);
        });
    };

    Survey.updateFromPost = function(req) {
        var survey;
        return Survey.findByPk(req.body.survey_id).then(function(surv) {
            survey = surv;
            survey.title = trimSubstringField(req.body.survey_title, 150);
            survey.description = trimSubstringField(req.body.survey_description, 500);
            survey.tags = parseTagsFromPost(req);
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
    };

    Survey.saveEmapicOpinion = function(req) {
        var body = req.body;
        if ((body.emapic_experience_comments && body.emapic_experience_comments !== 'null') ||
        (body.emapic_experience_final_position_reason && body.emapic_experience_final_position_reason !== 'null') ||
        (body.emapic_experience_geolocation_result && body.emapic_experience_geolocation_result !== 'null')) {
            var strquery = 'INSERT INTO metadata.emapic_opinions (browser_os, geolocation_result, final_position_reason, comments, geom, "timestamp", accuracy) VALUES (?, ?, ?, ?, ST_SetSRID(ST_MakePoint(?, ?), 4326), now(), ?)',
                precision = parseFloat(body.precision);
            return sequelize.query(strquery, {
                replacements: [body.browser_os,
                    body.emapic_experience_geolocation_result && body.emapic_experience_geolocation_result !== 'null' ? body.emapic_experience_geolocation_result : null,
                    body.emapic_experience_final_position_reason && body.emapic_experience_final_position_reason !== 'null' ? body.emapic_experience_final_position_reason : null,
                    body.emapic_experience_comments && body.emapic_experience_comments !== 'null' ? body.emapic_experience_comments : null,
                    body.lng, body.lat, isNaN(precision) ? null : Math.round(precision)],
                type: sequelize.QueryTypes.INSERT
            });
        } else {
            return Promise.resolve(null);
        }
    };

    Survey.saveGeolocationDistance = function(req) {
        var body = req.body;
        if (body.lat0 !== null && body.lat0 !== 'null' &&
        body.lng0 !== null && body.lng0 !== 'null') {
            var strquery = "INSERT INTO metadata.geolocation_distances (browser_os, distance, accuracy) VALUES (?, ST_Distance(ST_GeogFromText('SRID=4326;POINT(' || ? || ' ' || ? || ')'), ST_GeogFromText('SRID=4326;POINT(' || ? || ' ' || ? || ')')), ?)",
                precision = parseFloat(body.precision);
            return sequelize.query(strquery, {
                replacements: [body.browser_os, body.lng0, body.lat0, body.lng,
                    body.lat, isNaN(precision) ? null : Math.round(precision)],
                type: sequelize.QueryTypes.INSERT
            });
        } else {
            return Promise.resolve(null);
        }
    };

    Survey.getSearchVector = function() {
        return 'tsv';
    };

    Survey.getFieldsToHideInDescription = function() {
        return ['already_opened', 'description_or_title', 'tags_string',
            'welcome_text', 'end_text', 'expires', 'start_date',
            'dont_list', 'anonymized', 'language', 'public_statistics',
            'owner', 'tags'];
    };

    Survey.updateAllThumbnails = function() {
        return Promise.map(Survey.scope('alreadyOpened').findAll(), function(survey) {
            return survey.updateThumbnails();
        // If we take snapshots with multiple sizes, we should lower the concurrency
        }, {concurrency: 3});
    };

    // Instance Methods
    Survey.prototype.clone = function(userid) {
        var originalSurvey = this,
            newSurvey,
            props = Utils.extractProperties(originalSurvey, ['id', 'nr_votes', 'date_created', 'date_opened', 'date_closed', 'active']);
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
    };

    Survey.prototype.createTable = function() {
        var survey = this;
        return this.getQuestions().then(function(questions) {
            // We create the survey specific table
            return sequelize.query('CREATE TABLE opinions.survey_' + survey.id + '(gid bigserial NOT NULL PRIMARY KEY' + getAllFieldsSQL(questions, sqlType.ddl) + ', geom GEOMETRY(Point, 4326), "precision" integer, province_gid integer REFERENCES base_layers.provinces (gid) MATCH SIMPLE ON UPDATE NO ACTION ON DELETE NO ACTION, ' +
                'municipality_gid integer REFERENCES base_layers.municipalities (gid) MATCH SIMPLE ON UPDATE NO ACTION ON DELETE NO ACTION, "timestamp" timestamp without time zone, usr_id bigint' + (survey.multiple_answer ? '' : ' UNIQUE') + ' REFERENCES users (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE SET NULL);');
        }).spread(function(results, metadata) {
            // We create the triggers for assigning provinces and municipalities
            return Promise.all([sequelize.query('CREATE TRIGGER a_assign_province_trigger BEFORE INSERT OR UPDATE ON opinions.survey_' + survey.id + ' FOR EACH ROW EXECUTE PROCEDURE assign_province();'),
                sequelize.query('CREATE TRIGGER b_assign_municipality_trigger BEFORE INSERT OR UPDATE ON opinions.survey_' + survey.id + ' FOR EACH ROW EXECUTE PROCEDURE assign_municipality();')]);
        });
    };

    Survey.prototype.dropTable = function() {
        var survey = this;
        return this.dropAllSurveyFiles().then(function() {
            return sequelize.query('DROP TABLE IF EXISTS opinions.survey_' + survey.id + ';');
        });
    };

    Survey.prototype.dropAllSurveyFiles = function() {
        return FileHelper.deleteAllFilesFromFolder('images/survey/' + this.id);
    };

    Survey.prototype.recreateTable = function() {
        var survey = this;
        return Promise.join(survey.dropTable(), survey.clearAuxVotes(), function() {
            return survey.createTable();
        });
    };

    Survey.prototype.clearAuxVotes = function() {
        return Promise.map(this.getVotes(), function(vote) {
            return vote.destroy();
        });
    };

    Survey.prototype.clearTable = function() {
        return sequelize.query('DELETE FROM opinions.survey_' + this.id + ';');
    };

    Survey.prototype.clearVotes = function() {
        return Promise.all([this.clearTable(), this.clearAuxVotes()]);
    };

    Survey.prototype.updateThumbnails = function() {
        return (this.nr_votes >= 5) ? this.generateThumbnails() : this.deleteThumbnails();
    };

    Survey.prototype.generateThumbnails = function() {
        var id = this.id,
            encrId = this.encr_id,
            url = 'http://localhost:3001/survey/' + encrId + '/results';
        // TODO resize the snapshots from the optimal size (512x288 / 512x512) to the smaller possible sizes (256x144 / 400x400)
        return Promise.all([
            Utils.takeSnapshot(url, thumbnailsFolder + path.sep + 'small' + path.sep + encrId + '.png', 512, 288, 3000, 20000, 5, 256, 144),
            Utils.takeSnapshot(url, thumbnailsFolder + path.sep + 'share' + path.sep + encrId + '.png', 512, 512, 3000, 30000, 5, 400, 400)
        ]).catch(function(err) {
            logger.error('Could not generate all thumbnails for survey with id ' + id + ' : ' + err);
        });
    };

    Survey.prototype.deleteThumbnails = function() {
        var encrId = this.encr_id,
            paths = [thumbnailsFolder + path.sep + 'small' + path.sep + encrId + '.png',
                thumbnailsFolder + path.sep + 'share' + path.sep + encrId + '.png'];
        return Promise.map(paths, function(path) {
            return fsp.stat(path).catch(function(error) {
                // We ignore the error when file doesn't exist
            }).then(function(stats) {
                if (stats && stats.isFile()) {
                    return fsp.unlinkSync(path);
                }
            });
        });
    };

    Survey.prototype.getSubTitle = function() {
        // The subTitle should serve as a description of the survey question(s)
        return this.getQuestions({
            scope: 'withLegend'
        }).then(function(questions) {
            // As of now we only return it if the survey has only one question with legend
            if (questions.length !== 1) {
                return null;
            } else {
                return questions[0].question;
            }
        });
    };

    Survey.prototype.getHtml = function(req) {
        return Promise.map(this.getQuestions({
            scope: 'includeAnswers'
        }), function(question) {
            return question.getHtml(req);
        }).then(function(results){
            if (results.length === 1) {
                return results[0];
            }
            return '<div class="questions-block">' +
                results.join('</div><div class="questions-block" hidden>') +
                '</div>';
        });
    };

    Survey.prototype.saveResponse = function(req) {
        var survey = this,
            date = new Date(),
            dateUtc = date.toISOString().replace(/T/, ' ').replace(/Z/, ''),
            body = req.body;

        return Promise.join(this.getOwner(), this.getQuestions({
            scope: ['includeAnswers', 'includeSurvey']
        }), function(owner, questions) {
            var validAnswers = [];
            for (var j = 0, jLen = questions.length; j<jLen; j++) {
                // We first check that the answers are valid for its questions
                validAnswers.push(questions[j].checkValidResponse(body));
            }
            return Promise.all(validAnswers).then(function() {
                var usr_id = (req.user) ? parseInt(req.user.id, 10) : null;
                // If the survey is closed, or it's a draft and the
                // vote doesn't come from its owner, we reject the vote
                if (survey.active === false || (survey.active === null && usr_id !== owner.id)) {
                    return Promise.reject({
                        message: "survey is no longer open or it's in draft mode.",
                        status: 403,
                        code: 'forbidden_access'
                    });
                }
                // If the survey is a draft, then its owner's votes are stored as anonymous
                usr_id = (survey.active === null && usr_id === owner.id) ? null : usr_id;
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
                    precision = parseFloat(body.precision),
                    insert_params = [usr_id, isNaN(precision) ? null : Math.round(precision),
                        dateUtc, body.lng, body.lat];
                for (var i = 0, iLen = questions.length; i<iLen; i++) {
                    var vars = questions[i].getInsertSql(body);
                    insert_query1 += (vars[0] !== '' ? ', ' : '') + vars[0];
                    insert_query2 += (vars[1] !== '' ? ', ' : '') + vars[1];
                    insert_params = insert_params.concat(vars[2]);
                }

                insert_query1 += insert_query2 + ') RETURNING gid;';

                return sequelize.query(insert_query1,
                    { replacements: insert_params }
                ).spread(function(data) {
                    return Promise.try(function() {
                        var postInserts = [];
                        for (var j = 0, jLen = questions.length; j<jLen; j++) {
                            postInserts.push(questions[j].getPostInsertOperations(body, data[0].gid));
                        }
                        return Promise.all(postInserts);
                    }).catch(function(err) {
                        // If an error happens during post-insert operations,
                        // we must delete the previously saved answer
                        logger.debug('An error happened during post-insert operations. Deleting previously saved answer with gid ' + data[0].gid + ' for survey ' + survey.id);
                        return sequelize.query('DELETE FROM opinions.survey_' + survey.id + ' WHERE gid = ?;',
                            { replacements: [data[0].gid], type: sequelize.QueryTypes.DELETE }
                        ).then(function() {
                            throw err;
                        });
                    });
                }).then(function() {
                    return models.Vote.create({
                        user_id : usr_id,
                        survey_id : survey.id,
                        vote_date : date
                    });
                });
            });
        });
    };

    Survey.prototype.getUserResponseDates = function(userId) {
        return this.getVotes({
            where: {
                'user_id': userId
            },
            order: 'vote_date DESC' /// this func is not called from anywhere so it cannot be tested for sequelize upgrade to v5
        }).then(function(votes) {
            var dates = [];
            for (var j = 0, jLen = votes.length; j<jLen; j++) {
                dates.push(votes[j].vote_date);
            }
            return dates;
        });
    };

    Survey.prototype.getUserNrResponses = function(userId) {
        return this.countVotes({
            where: {
                'user_id': userId
            }
        });
    };

    Survey.prototype.getUserFullResponses = function(userId) {
        var surv = this,
            id = this.id,
            questions;
        return this.getQuestions({ scope: 'includeSurvey' }).then(function(qstns) {
            questions = qstns;
            return sequelize.query("SELECT (extract(epoch from a.timestamp) * 1000)::bigint as timestamp, st_asgeojson(a.geom) as geojson, a.usr_id, b.login" + getAllFieldsSQL(questions, sqlType.select) + " FROM opinions.survey_" + id + " a LEFT JOIN users b ON a.usr_id = b.id WHERE usr_id = ? LIMIT 1;", {
                replacements: [userId],
                type: sequelize.QueryTypes.SELECT
            });
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
    };

    Survey.prototype.getAnswerImagePath = function(questionId, answerId) {
        return sequelize.query('SELECT b.path, b.mime_type FROM opinions.survey_' + this.id + ' a JOIN metadata.files b ON a.q' + questionId + ' = b.id WHERE a.gid = ?;', {
            replacements: [answerId],
            type: sequelize.QueryTypes.SELECT
        }).then(function(data) {
            return (data.length === 0) ? null : data[0].path;
        });
    };

    Survey.prototype.getFullResponses = function(getFilters, lang) {
        return getSurveyResponsesSql(this, answersRequestType.full, getFilters, lang).then(function(data) {
            return sequelize.query(data.sql, {
                replacements: data.params,
                type: sequelize.QueryTypes.SELECT
            });
        });
    };

    Survey.prototype.getResponses = function(getFilters) {
        return getSurveyResponsesSql(this, answersRequestType.normal, getFilters).then(function(data) {
            return sequelize.query(data.sql, {
                replacements: data.params,
                type: sequelize.QueryTypes.SELECT
            });
        });
    };

    Survey.prototype.getAnonymizedResponses = function(getFilters) {
        return getSurveyResponsesSql(this, answersRequestType.anonymized, getFilters).then(function(data) {
            return sequelize.query(data.sql, {
                replacements: data.params,
                type: sequelize.QueryTypes.SELECT
            });
        });
    };

    Survey.prototype.getTotals = function() {
        var survey = this;
        return this.getLegend().then(function(legend) {
            if (!('color' in legend)) {
                return Promise.resolve(null);
            }
            var query = "SELECT count(*) AS total_responses";
            for (var i in legend.color.responses) {
                if ({}.hasOwnProperty.call(legend.color.responses, i)) {
                    query += ", (SELECT count(*) FROM opinions.survey_" + survey.id + " WHERE " + legend.color.question + "::text = '" + i + "'::text) AS \"" + i + "\"";
                }
            }
            query += " FROM opinions.survey_" + survey.id + ";";
            return sequelize.query(query, { type: sequelize.QueryTypes.SELECT });
        }).then(function(results) {
            if (results === null) {
                return Promise.resolve(results);
            }
            return Promise.resolve(results[0]);
        });
    };

    Survey.prototype.getAggregatedTotals = function(layer, params) {
        var survey = this,
            namePromise,
            geom,
            sql1,
            sql2;
        params.geom = params.geom || 'simple';
        switch (layer) {
            case 'countries':
                sql1 = "SELECT lower(a.iso_code_2) AS iso_code, count(b.gid) AS total_responses";
                sql2 = " FROM base_layers.countries a JOIN base_layers.provinces c ON a.gid = c.country_gid JOIN opinions.survey_" + survey.id + " b ON c.gid = b.province_gid GROUP BY a.gid ORDER BY total_responses DESC, iso_code ASC;";
                namePromise = ('lang' in params) ? checkColumnExists('name_' + params.lang, 'countries', 'base_layers').then(function(result) {
                    return ', a.name' + (result[0].exists ? '_' + params.lang : '') + ' AS name';
                }) : Promise.resolve(', a.name AS name');
                break;
            case 'provinces':
                sql1 = "SELECT gns_adm1 AS country_id, iso_3166_2 AS iso_code, adm1_code as adm_code, type_en AS adm_type, lower(iso_a2) AS country_iso_code, count(b.gid) AS total_responses";
                sql2 = " FROM base_layers.provinces a JOIN opinions.survey_" + survey.id + " b ON a.gid = b.province_gid JOIN base_layers.countries c ON a.country_gid = c.gid " +
                    "GROUP BY a.gid, c.gid ORDER BY total_responses DESC, a.name ASC;";
                namePromise = ('lang' in params) ? Promise.join(
                    checkColumnExists('name_' + params.lang, 'provinces', 'base_layers'),
                    checkColumnExists('name_' + params.lang, 'countries', 'base_layers'),
                    function(provinceName, countryName) {
                        return ', a.name' + (provinceName[0].exists ? '_' + params.lang : '') + ' AS name, ' +
                            'c.name' + (countryName[0].exists ? '_' + params.lang : '') + ' AS supersuperheader';
                    }
                ) : Promise.resolve(', a.name AS name, c.name AS superheader');
                break;
            case 'municipalities':
                sql1 = "SELECT a.codigo AS adm_code, a.cod_prov, a.provincia, a.cod_ccaa, a.comautonom, c.adm1_code as province_adm_code, lower(c.iso_a2) AS country_iso_code, count(b.gid) AS total_responses";
                sql2 = " FROM base_layers.municipalities a JOIN base_layers.provinces c ON a.province_gid = c.gid JOIN base_layers.countries d ON c.country_gid = d.gid" +
                    " JOIN opinions.survey_" + survey.id + " b ON a.gid = b.municipality_gid GROUP BY a.gid, c.gid, d.gid ORDER BY total_responses DESC, a.name ASC;";
                namePromise = ('lang' in params) ? Promise.join(
                    checkColumnExists('name_' + params.lang, 'municipalities', 'base_layers'),
                    checkColumnExists('name_' + params.lang, 'provinces', 'base_layers'),
                    checkColumnExists('name_' + params.lang, 'countries', 'base_layers'),
                    function(municipalityName, provinceName, countryName) {
                        return ', a.name' + (municipalityName[0].exists ? '_' + params.lang : '') + ' AS name, ' +
                            'c.name' + (provinceName[0].exists ? '_' + params.lang : '') + ' AS superheader, ' +
                            'd.name' + (countryName[0].exists ? '_' + params.lang : '') + ' AS supersuperheader';
                    }
                ) : Promise.resolve(', a.name AS name, c.name AS superheader, d.name AS supersuperheader');
                break;
            default:
                return Promise.reject(new Error('INVALID BASE LAYER'));
        }
        if ('geom' in params) {
            switch (params.geom) {
                case 'simple':
                    geom = ', st_asgeojson(a.simp_geom) as geojson';
                    break;
                case 'full':
                    geom = ', st_asgeojson(a.geom) as geojson';
                    break;
                case 'bbox':
                    geom = ', st_asgeojson(st_envelope(a.geom)) as geojson';
                    break;
                case 'centroid':
                    geom = ', st_asgeojson(st_centroid(a.geom)) as geojson';
                    break;
                case 'none':
                    geom = '';
                    break;
                default:
                    return Promise.reject(new Error('INVALID GEOM TYPE'));
            }
        }
        return Promise.join(namePromise, this.getLegend(), function(nameCol, legend) {
            var query = sql1 + nameCol;
            if (legend && legend.color) {
                for (var i = 0, iLen = legend.color.length; i<iLen; i++) {
                    var legendResponses = legend.color[i].responses_array;
                    for (var j = 0, jLen = legendResponses.length; j<jLen; j++) {
                        query += ", count(CASE WHEN b." + legend.color[i].question + "::text = '" + legendResponses[j].id + "'::text THEN 1 ELSE NULL::integer END) AS \"" + legend.color[i].question + "_" + legendResponses[j].id + "\"";
                    }
                }
            }
            query += geom + sql2;
            return sequelize.query(query, { type: sequelize.QueryTypes.SELECT });
        });
    };

    Survey.prototype.getCustomFieldsDescription = function(fields) {
        if (typeof this.owner !== 'undefined') {
            delete fields.owner_id;
            fields.owner = this.owner.getDescription();
        }
        return fields;
    };

    Survey.prototype.getFullDescription = function() {
        var description = this.getDescription(),
            ownerPromise = typeof this.owner !== 'undefined' ?
                Promise.resolve(this.owner) : this.getOwner();
        return Promise.join(ownerPromise, this.getQuestions({
            scope: 'includeAnswers'
        }), function(owner, questions) {
            description.owner = owner.getDescription();
            return Promise.map(questions, function(question) {
                return question.getFullDescription();
            });
        }).then(function(questionsDesc) {
            for (var i = 0, iLen = questionsDesc.length; i<iLen; i++) {
                delete questionsDesc[i].survey_id;
            }
            description.questions = questionsDesc;
            return description;
        });
    };

    Survey.prototype.getLegend = function() {
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
                            ((question.Answers[k].sortorder === -1) ?
                            lastAnswers : sublegend.responses_array).push({
                                id: question.Answers[k].sortorder.toString(),
                                value: question.Answers[k].answer,
                                legend: question.Answers[k].legend
                            });
                        }
                    }
                    sublegend.responses_array = sublegend.responses_array.concat(lastAnswers);
                    legend[question.legend_question].push(sublegend);
                }
            }
            return legend;
        });
    };

    return Survey;
};
