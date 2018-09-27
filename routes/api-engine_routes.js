var fs = require('fs'),
    Promise = require('bluebird'),
    bases = require('bases'),
    RateLimit = require('express-rate-limit'),
    logger = require('../utils/logger'),
    nconf = require('nconf'),
    emapicOpinionFreq = parseFloat(nconf.get('app').emapicOpinionFreq),
    sequelize = models.sequelize;

module.exports = function(app) {

    function handleInternalError(req, res) {
        return function(err) {
            logger.error('Internal server error during API request: ' + err.message);
            res.status(500).json({ error_code: 'internal_error', error: 'an internal server error has occured.' });
        };
    }

    app.get('/survey/:id', function(req, res) {
        models.Survey.scope('includeAuthor').findById(Utils.decryptSurveyId(req.params.id)).then(function(survey) {
            if (survey === null) {
                return res.redirect('/');
            }
            // Survey is in draft mode and it's not being tested by its owner
            if ((survey.active === null) && (!req.user || (survey.owner.id !== req.user.id))) {
                return res.redirect('/');
            }
            // Survey is closed
            if (survey.active === false) {
                return res.redirect('/survey/' + req.params.id + '/results');
            }
            return Promise.join(survey.getHtml(req), survey.getSubTitle(), survey.getUserFullResponses(req.user ? req.user.id : null), function(html, subTitle, responses) {
                // If the survey allows multiple answers, then we don't
                // set an already voted position
                var position = survey.multiple_answer ? null : responses.geometry.coordinates;
                res.render('templates/survey', {
                    title : survey.title,
                    survey : survey,
                    subTitle : subTitle,
                    questions_html : html,
                    responses : JSON.stringify(responses.properties),
                    position : JSON.stringify(position),
                    emapicOpinion : (survey.active === null) ? false : (Math.random() < emapicOpinionFreq),
                    layout : 'layouts/map'
                });
            });
        });
    });

    app.get('/survey/:id/results', function(req, res) {
        models.Survey.scope('includeAuthor').findById(Utils.decryptSurveyId(req.params.id)).then(function(survey) {
            if (survey === null) {
                return res.redirect('/');
            }
            // Survey is closed
            if ((survey.active === false) ||
            // Data required by the owner
            (req.user && survey.owner.id === req.user.id) ||
            // Survey is active and results are always public
            (survey.active === true && survey.public_results) ||
            // It's a local request from the server itself
            (req.ip === '127.0.0.1' && (req.host === '127.0.0.1' || req.host === 'localhost'))) {
                return Promise.join(survey.getHtml(req), survey.getSubTitle(), survey.getUserFullResponses(req.user ? req.user.id : null), function(html, subTitle, responses) {
                    // If the survey allows multiple answers, then we don't
                    // set an already voted position
                    var position = survey.multiple_answer ? null : responses.geometry.coordinates;
                    res.render('templates/survey', {
                        title : survey.title,
                        survey : survey,
                        results : true,
                        subTitle : subTitle,
                        questions_html : html,
                        responses : JSON.stringify(responses.properties),
                        position : JSON.stringify(position),
                        emapicOpinion : false,
                        layout : 'layouts/map'
                    });
                });
            }
            return res.redirect('/survey/' + req.params.id);
        });
    });

    app.get('/api/survey/:id/results', function(req, res) {
        models.Survey.scope('includeAuthor').findById(Utils.decryptSurveyId(req.params.id)).then(function(survey) {
            if (survey === null) {
                return res.status(404).json({ error_code: 'invalid_resource', error: 'requested survey doesn\'t exist.' });
            }
            // Survey is closed
            if ((survey.active === false) ||
            // Data required by the owner
            (req.user && survey.owner.id === req.user.id) ||
            // Survey is active and results are always public or shown after vote
            (survey.active === true && (survey.public_results || survey.results_after_vote)) ||
            // It's a local request from the server itself
            (req.ip === '127.0.0.1' && (req.host === '127.0.0.1' || req.host === 'localhost'))) {
                return Promise.join(survey.getAnonymizedResponses(), survey.getQuestions({
                    scope: 'includeAnswers'
                }), function(responses, questions) {
                    var answers = [];
                    for (var i = 0, iLen = questions.length; i<iLen; i++) {
                        answers.push(questions[i].Answers);
                    }
                    res.json(postGISQueryToFeatureCollection(addIndivVotePopupMessage(responses, questions, answers, req)));
                });
            } else {
                return res.status(403).json({ error_code: 'forbidden_access', error: 'you don\'t have the required permissions.' });
            }
        }).catch(handleInternalError(req, res));
    });

    app.get('/api/user', requireRole(null, true), function(req, res) {
        res.json(req.user.getDescription());
    });

    app.get('/api/surveys', function(req, res) {
        var login = req.query.login && req.query.login.trim() !== '' ? req.query.login : null,
            userId = isNaN(req.query.userId) ? null : req.query.userId,
            query = req.query.q && req.query.q.trim() !== '' ? req.query.q : null,
            tag = req.query.tag && req.query.tag.trim() !== '' ? req.query.tag : null,
            status = req.query.status && req.query.status.trim() !== '' ? req.query.status : null,
            pageNr = isNaN(req.query.page) ? null : req.query.page,
            pageSize = isNaN(req.query.size) ? null : req.query.size,
            surveysPromise = (userId !== null) ?
                models.Survey.findPublicSurveys(userId,
                    status, query, tag,
                    pageSize, pageNr) :
                models.Survey.findPublicSurveysByUserLogin(login,
                    status, query, tag,
                    pageSize, pageNr);
        surveysPromise.then(function(surveys) {
            var results = [];
            for (var i = 0, len = surveys.rows.length; i<len; i++) {
                results.push(surveys.rows[i].getDescription());
            }
            return res.json({
                count: surveys.count,
                rows: results
            });
        }).catch({ message: 'NULL_USER' }, function(err) {
            return res.status(404).json({ error_code: 'invalid_resource', error: 'requested user doesn\'t exist.' });
        }).catch(handleInternalError(req, res));
    });

    app.get('/api/surveys/own', requireRole(null, true), function(req, res) {
        var query = req.query.q && req.query.q.trim() !== '' ? req.query.q : null,
            tag = req.query.tag && req.query.tag.trim() !== '' ? req.query.tag : null,
            status = req.query.status && req.query.status.trim() !== '' ? req.query.status : null,
            pageNr = isNaN(req.query.page) ? null : req.query.page,
            pageSize = isNaN(req.query.size) ? null : req.query.size;
        models.Survey.findSurveys(req.user.id, false, status, query, tag, pageSize, pageNr).then(function(surveys) {
            var results = [];
            for (var i = 0, len = surveys.rows.length; i<len; i++) {
                results.push(surveys.rows[i].getDescription());
            }
            return res.json({
                count: surveys.count,
                rows: results
            });
        }).catch(handleInternalError(req, res));
    });

    app.get('/api/survey/:id/description', function(req, res) {
        models.Survey.scope('includeAuthor').findById(Utils.decryptSurveyId(req.params.id)).then(function(survey) {
            if (survey === null) {
                return res.status(404).json({ error_code: 'invalid_resource', error: 'requested survey doesn\'t exist.' });
            }
            // Survey is closed
            if ((survey.active === false) ||
            // Data required by the owner
            (req.user && survey.owner.id === req.user.id) ||
            // Survey is active and results are always public or shown after vote
            (survey.active === true && (survey.public_results || survey.results_after_vote)) ||
            // It's a local request from the server itself
            (req.ip === '127.0.0.1' && (req.host === '127.0.0.1' || req.host === 'localhost'))) {
                return survey.getFullDescription().then(function(response) {
                    res.json(response);
                });
            } else {
                res.status(403).json({ error_code: 'forbidden_access', error: 'you don\'t have the required permissions.' });
            }
        }).catch(handleInternalError(req, res));
    });

    app.get('/api/survey/:surveyId/result/:answrId/image/:qstnId', function(req, res) {
        var answrId = parseInt(req.params.answrId, 10),
            qstnId = parseInt(req.params.qstnId, 10);
        if (isNaN(qstnId) || isNaN(answrId)) {
            return res.send(404);   // HTTP status 404: NotFound
        }
        models.Survey.scope('includeAuthor').findById(Utils.decryptSurveyId(req.params.surveyId)).then(function(survey) {
            return survey.getAnswerImagePath(qstnId, answrId);
        }).then(function(path) {
            if (path === null) {
                return res.send(404);   // HTTP status 404: NotFound
            }
            res.contentType(Utils.getFileMimeType(path, 'image/png'));
            fs.createReadStream(path).pipe(res);
        }).catch(handleInternalError(req, res));
    });

    app.get('/api/survey/:id/totals', function(req, res) {
        models.Survey.scope('includeAuthor').findById(Utils.decryptSurveyId(req.params.id)).then(function(survey) {
            if (survey === null) {
                return res.status(404).json({ error_code: 'invalid_resource', error: 'requested survey doesn\'t exist.' });
            }
            // Survey is closed
            if ((survey.active === false) ||
            // Data required by the owner
            (req.user && survey.owner.id === req.user.id) ||
            // Survey is active and results are always public or shown after vote
            (survey.active === true && (survey.public_results || survey.results_after_vote)) ||
            // It's a local request from the server itself
            (req.ip === '127.0.0.1' && (req.host === '127.0.0.1' || req.host === 'localhost'))) {
                return survey.getTotals().then(function(response) {
                    res.json(response);
                });
            } else {
                res.status(403).json({ error_code: 'forbidden_access', error: 'you don\'t have the required permissions.' });
            }
        }).catch(handleInternalError(req, res));
    });

    app.get('/api/survey/:id/totals/:layer', function(req, res) {
        models.Survey.scope('includeAuthor').findById(Utils.decryptSurveyId(req.params.id)).then(function(survey) {
            if (survey === null) {
                return res.status(404).json({ error_code: 'invalid_resource', error: 'requested survey doesn\'t exist.' });
            }
            // Survey is closed
            if ((survey.active === false) ||
            // Data required by the owner
            (req.user && survey.owner.id === req.user.id) ||
            // Survey is active and results are always public or shown after vote
            (survey.active === true && (survey.public_results || survey.results_after_vote)) ||
            // It's a local request from the server itself
            (req.ip === '127.0.0.1' && (req.host === '127.0.0.1' || req.host === 'localhost'))) {
                var layer = req.params.layer,
                    params = req.query,
                    promise;
                return survey.getAggregatedTotals(layer, params).then(function(features) {
                    var results = [];
                    if (features && features.length > 0) {
                        if ('geojson' in features[0]) {
                            results = postGISQueryToFeatureCollection(features);
                        } else {
                            results = features;
                        }
                    }
                    res.json(results);
                }).catch(function(err) {
                    var errorMsg,
                        errorHttpCode,
                        errorCode;
                    switch (err.message) {
                        case 'INVALID GEOM TYPE':
                            errorHttpCode = 422;
                            errorCode = 'invalid_geom';
                            errorMsg = 'requested invalid geom type.';
                            logger.info("Requested invalid aggregation by geom type '" + params.geom + "' for base layer '" + layer + "'.");
                            break;
                        case 'INVALID BASE LAYER':
                            errorHttpCode = 404;
                            errorCode = 'invalid_resource';
                            errorMsg = 'requested invalid base layer.';
                            logger.info("Requested invalid aggregation by base layer '" + layer + "'.");
                            break;
                        default:
                            errorHttpCode = 500;
                            errorCode = 'internal_error';
                            errorMsg = 'an error happened while aggregating the data.';
                            logger.info("Requested aggregation by geom type '" + params.geom + "' for base layer '" + layer + "' raised error: " + err.message);
                    }
                    return res.status(errorHttpCode).json({ error_code: errorCode, error: errorMsg });
                });
            } else {
                res.status(403).json({ error_code: 'forbidden_access', error: 'you don\'t have the required permissions.' });
            }
        }).catch(handleInternalError(req, res));
    });

    app.get('/api/survey/:id/legend', function(req, res) {
        models.Survey.scope('includeAuthor').findById(Utils.decryptSurveyId(req.params.id)).then(function(survey) {
            if (survey === null) {
                return res.status(404).json({ error_code: 'invalid_resource', error: 'requested survey doesn\'t exist.' });
            }
            // Survey is closed
            if ((survey.active === false) ||
            // Data required by the owner
            (req.user && survey.owner.id === req.user.id) ||
            // Survey is active and results are always public or shown after vote
            (survey.active === true && (survey.public_results || survey.results_after_vote)) ||
            // It's a local request from the server itself
            (req.ip === '127.0.0.1' && (req.host === '127.0.0.1' || req.host === 'localhost'))) {
                return survey.getLegend().then(function(legend) {
                    res.json(legend);
                });
            } else {
                res.status(403).json({ error_code: 'forbidden_access', error: 'you don\'t have the required permissions.' });
            }
        }).catch(handleInternalError(req, res));
    });

    app.post('/api/survey/:id/results', function(req, res) {
        models.Survey.findById(Utils.decryptSurveyId(req.params.id)).then(function(survey) {
            if (survey === null) {
                return res.status(404).json({ error_code: 'invalid_resource', error: 'requested survey doesn\'t exist.' });
            }
            if (typeof req.body.responses === undefined) {
                return res.status(400).json({ error_code: 'invalid_request',  error: 'you must provide a response to save.' });
            }
            Promise.try(function() {
                // We translate the stringified responses object to the previously
                // used plain POST structure
                var body = req.body,
                    responses = JSON.parse(body.responses);
                for (i in responses) {
                    if (responses[i].response.id !== null) {
                        body['q' + responses[i].questionOrder+ '.id']  = responses[i].response.id;
                    }
                    if (responses[i].response.file === undefined) { //no file
                        body['q' + responses[i].questionOrder+ '.value']  = responses[i].response.value;
                    } else {
                        if (req.files['file_'+responses[i].questionOrder] !== undefined) {
                            body['q' + responses[i].questionOrder+ '.value']  = req.files['file_'+responses[i].questionOrder];
                        }
                    }
                }
                delete body.responses;
                return survey.saveResponse(req);
            }).then(function(response) {
                res.end();
            }).catch(function(err) {
                logger.error('Error while saving response for survey with id ' + survey.id + ' : ' + err.message);
                var error;
                if ('status' in err) {
                    res.status(err.status);
                    error = { error_code: err.code, error: err.message };
                } else {
                    res.status(500);
                    error = { error_code: 'internal_error', error: 'response couldn\'t be saved.' };
                }
                res.json(error);
            });
        }).catch(handleInternalError(req, res));
    });

    app.get('/api/survey/:id/export', function(req, res) {
        models.Survey.scope('includeAuthor').findById(Utils.decryptSurveyId(req.params.id)).then(function(survey) {
            if (survey === null) {
                return res.status(404).json({ error_code: 'invalid_resource', error: 'requested survey doesn\'t exist.' });
            }
            // Survey is closed
            if ((survey.active === false) ||
            // Data required by the owner
            (req.user && survey.owner.id === req.user.id) ||
            // Survey is active and results are always public or shown after vote
            (survey.active === true && (survey.public_results || survey.results_after_vote)) ||
            // It's a local request from the server itself
            (req.ip === '127.0.0.1' && (req.host === '127.0.0.1' || req.host === 'localhost'))) {
                return Promise.join(survey.getFullResponses(), survey.getQuestions({
                    scope: 'includeAnswers'
                }), function(responses, questions) {
                    res.attachment(survey.title + '.csv');
                    pgQueryFullResultsToCsv(responses, questions).then(function(csv) {
                        res.send(csv);
                    });
                });
            } else {
                res.status(403).json({ error_code: 'forbidden_access', error: 'you don\'t have the required permissions.' });
            }
        }).catch(handleInternalError(req, res));
    });

    // One request per minute limit for full/simple geom requests as data can be
    // quite big
    var baseLayerFullGeomLimiter = new RateLimit({
        windowMs: 60*1000,
        max: 1,
        delayMs: 0,
        handler: function (req, res, next) {
            return res.status(429).json({ error_code: 'base_layer_limit_exceeded', error: 'base layer API full/simple geom requests limited to 1 per minute.' });
        }
    });

    app.get('/api/baselayers/:layer', function(req, res, next) {
        // Limit full/simple geom requests in production environmentes only
        if ('production' === app.get('env')) {
            switch (req.query.geom) {
                case 'simple':
                case 'full':
                    return baseLayerFullGeomLimiter(req, res, next);
            }
        }
        next();

    }, function(req, res) {
        var layer = req.params.layer,
            params = req.query,
            sql,
            where = [],
            geom,
            replacements = {},
            namePromise;
        params.geom = params.geom || 'simple';
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
                    logger.info("Requested invalid geom type '" + params.geom + "' for base layer '" + layer + "'.");
                    return res.status(422).json({ error_code: 'invalid_geom', error: "requested invalid geom type." });
            }
        }
        if ('lang' in params) {
            namePromise = checkColumnExists('name_' + params.lang, layer, 'base_layers').then(function(result) {
                if (result[0].exists) {
                    return 'a.name_' + params.lang;
                } else {
                    return 'a.name';
                }
            });
        } else {
            namePromise = Promise.resolve('a.name');
        }
        namePromise.then(function(nameCol) {
            switch (layer) {
                case 'municipalities':
                    if ('prov' in params && !(isNaN(params.prov))) {
                        where.push('a.cod_prov = :prov');
                        replacements.prov = params.prov;
                    } else if ('ccaa' in params && !(isNaN(params.ccaa))) {
                        where.push('a.cod_ccaa = :ccaa');
                        replacements.ccaa = params.ccaa;
                    }
                    sql = 'SELECT a.codigo AS adm_code, ' + nameCol + ' AS name, a.cod_prov, a.provincia, a.cod_ccaa, a.comautonom, a.pobmun15_p AS pobumn15, a.pobmun15_h, a.pobmun15_m, lower(b.iso_a2) AS country_iso_code' + geom + ' FROM base_layers.municipalities a JOIN base_layers.provinces b ON a.province_gid = b.gid' + (where.length > 0 ? ' WHERE ' + where.join(' AND ') : '') + ' ORDER BY adm_code;';
                    break;
                case 'provinces':
                    if (!('includeMinor' in params && params.includeMinor.toLowerCase() === 'true')) {
                        where.push('name IS NOT NULL');
                    }
                    if ('country' in params) {
                        where.push('lower(a.iso_a2) = lower(:country)');
                        replacements.country = params.country;
                    }
                    sql = 'SELECT a.diss_me AS province_id, a.iso_3166_2 AS iso_code, a.adm1_code AS adm_code, ' + nameCol + ' AS name, a.type_en AS type, lower(a.iso_a2) AS country_iso_code' + geom + ' FROM base_layers.provinces a' + (where.length > 0 ? ' WHERE ' + where.join(' AND ') : '') + ' ORDER BY adm_code;';
                    break;
                case 'countries':
                    where.push('iso_code_2 IS NOT NULL');
                    sql = 'SELECT lower(a.iso_code_2) AS iso_code, ' + nameCol + ' AS name' + geom + ' FROM base_layers.countries a' + (where.length > 0 ? ' WHERE ' + where.join(' AND ') : '') + ' ORDER BY iso_code;';
                    break;
                default:
                    logger.info("Requested base layer '" + layer + "' doesn't exist.");
                    return res.status(404).json({ error_code: 'invalid_resource', error: "requested layer doesn't exist." });
            }
            return sequelize.query(sql, {
                replacements: replacements,
                type: sequelize.QueryTypes.SELECT
            }).then(function(features) {
                var results = [];
                if (features && features.length > 0) {
                    if ('geojson' in features[0]) {
                        results = postGISQueryToFeatureCollection(features);
                    } else {
                        results = features;
                    }
                }
                var size = Buffer.byteLength(JSON.stringify(results)) / 1000000;
                if (size > 25) {
                    logger.warn("Requested layer '" + layer + "' with " + (('geom' in params) ? params.geom : 'simple') + " geom, which is too big for being served as geojson (" + size + " MB).");
                    return res.status(403).json({ error_code: 'layer_too_big', error: "requested layer is too big for being served as geojson (25 MB max)." });
                }
                res.json(results);
            });
        }).catch(handleInternalError(req, res));
    });

};
