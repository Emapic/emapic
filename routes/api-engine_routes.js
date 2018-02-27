var Promise = require('bluebird'),
    bases = require('bases'),
    RateLimit = require('express-rate-limit'),
    logger = require('../utils/logger'),
    nconf = require('nconf'),
    emapicOpinionFreq = parseFloat(nconf.get('app').emapicOpinionFreq),
    sequelize = models.sequelize;

module.exports = function(app) {

    app.get('/survey/:id', function(req, res) {
        models.Survey.scope('includeAuthor').findById(decryptSurveyId(req.params.id)).then(function(survey) {
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
            Promise.join(survey.getHtml(), survey.getSubTitle(), survey.getUserFullResponses(req.user ? req.user.id : null), function(html, subTitle, responses) {
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
        models.Survey.scope('includeAuthor').findById(decryptSurveyId(req.params.id)).then(function(survey) {
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
                return Promise.join(survey.getHtml(), survey.getSubTitle(), survey.getUserFullResponses(req.user ? req.user.id : null), function(html, subTitle, responses) {
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
        models.Survey.scope('includeAuthor').findById(decryptSurveyId(req.params.id)).then(function(survey) {
            if (survey === null) {
                return res.status(404).json({ error: 'requested survey doesn\'t exist.' });
            }
            // Survey is closed
            if ((survey.active === false) ||
            // Data required by the owner
            (req.user && survey.owner.id === req.user.id) ||
            // Survey is active and results are always public or shown after vote
            (survey.active === true && (survey.public_results || survey.results_after_vote)) ||
            // It's a local request from the server itself
            (req.ip === '127.0.0.1' && (req.host === '127.0.0.1' || req.host === 'localhost'))) {
                Promise.join(survey.getAnonymizedResponses(), survey.getQuestions({
                    scope: 'includeAnswers'
                }), function(responses, questions) {
                    var answers = [];
                    for (var i = 0, iLen = questions.length; i<iLen; i++) {
                        answers.push(questions[i].Answers);
                    }
                    res.json(postGISQueryToFeatureCollection(addIndivVotePopupMessage(responses, questions, answers)));
                });
            } else {
                res.status(403).json({ error: 'you don\'t have the required permissions.' });
            }
        });
    });

    app.get('/api/surveys', function(req, res) {
        var login = req.query.login,
            userId = isNaN(req.query.userId) ? null : req.query.userId,
            query = req.query.q,
            tag = req.query.tag,
            pageNr = isNaN(req.query.page) ? null : req.query.page,
            pageSize = isNaN(req.query.size) ? null : req.query.size,
            results = [],
            surveysPromise = (userId !== null) ?
                models.Survey.findActiveSurveys(userId,
                    query && query.trim() !== '' ? query : null,
                    tag && tag.trim() !== '' ? tag : null,
                    pageSize, pageNr) :
                models.Survey.findActiveSurveysByUserLogin(login && login.trim() !== '' ? login : null,
                    query && query.trim() !== '' ? query : null,
                    tag && tag.trim() !== '' ? tag : null,
                    pageSize, pageNr);
        surveysPromise.then(function(surveys) {
            for (var i = 0, len = surveys.rows.length; i<len; i++) {
                results.push(surveys.rows[i].getDescription());
            }
            return res.json({
                count: surveys.count,
                rows: results
            });
        }).catch({ message: 'NULL_USER' }, function(err) {
            return res.status(404).json({ error: 'requested user doesn\'t exist.' });
        });
    });

    app.get('/api/survey/:id/description', function(req, res) {
        models.Survey.scope('includeAuthor').findById(decryptSurveyId(req.params.id)).then(function(survey) {
            if (survey === null) {
                return res.status(404).json({ error: 'requested survey doesn\'t exist.' });
            }
            // Survey is closed
            if ((survey.active === false) ||
            // Data required by the owner
            (req.user && survey.owner.id === req.user.id) ||
            // Survey is active and results are always public or shown after vote
            (survey.active === true && (survey.public_results || survey.results_after_vote)) ||
            // It's a local request from the server itself
            (req.ip === '127.0.0.1' && (req.host === '127.0.0.1' || req.host === 'localhost'))) {
                survey.getFullDescription().then(function(response) {
                    res.json(response);
                });
            } else {
                res.status(403).json({ error: 'you don\'t have the required permissions.' });
            }
        });
    });

    app.get('/api/survey/:id/totals', function(req, res) {
        models.Survey.scope('includeAuthor').findById(decryptSurveyId(req.params.id)).then(function(survey) {
            if (survey === null) {
                return res.status(404).json({ error: 'requested survey doesn\'t exist.' });
            }
            // Survey is closed
            if ((survey.active === false) ||
            // Data required by the owner
            (req.user && survey.owner.id === req.user.id) ||
            // Survey is active and results are always public or shown after vote
            (survey.active === true && (survey.public_results || survey.results_after_vote)) ||
            // It's a local request from the server itself
            (req.ip === '127.0.0.1' && (req.host === '127.0.0.1' || req.host === 'localhost'))) {
                survey.getTotals().then(function(response) {
                    res.json(response);
                });
            } else {
                res.status(403).json({ error: 'you don\'t have the required permissions.' });
            }
        });
    });

    app.get('/api/survey/:id/totals/:layer', function(req, res) {
        models.Survey.scope('includeAuthor').findById(decryptSurveyId(req.params.id)).then(function(survey) {
            if (survey === null) {
                return res.status(404).json({ error: 'requested survey doesn\'t exist.' });
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
                survey.getAggregatedTotals(layer, params).then(function(features) {
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
                        errorCode;
                    switch (err.message) {
                        case 'INVALID GEOM TYPE':
                            errorCode = 400;
                            errorMsg = 'requested invalid geom type.';
                            logger.info("Requested invalid aggregation by geom type '" + params.geom + "' for base layer '" + layer + "'.");
                            break;
                        case 'INVALID BASE LAYER':
                            errorCode = 404;
                            errorMsg = 'requested invalid base layer.';
                            logger.info("Requested invalid aggregation by base layer '" + layer + "'.");
                            break;
                        default:
                            errorCode = 500;
                            errorMsg = 'an error happened while aggregating the data.';
                            logger.info("Requested aggregation by geom type '" + params.geom + "' for base layer '" + layer + "' raised error: " + err.message);
                    }
                    return res.status(errorCode).json({ error: errorMsg });
                });
            } else {
                res.status(403).json({ error: 'you don\'t have the required permissions.' });
            }
        });
    });

    app.get('/api/survey/:id/legend', function(req, res) {
        models.Survey.scope('includeAuthor').findById(decryptSurveyId(req.params.id)).then(function(survey) {
            if (survey === null) {
                return res.status(404).json({ error: 'requested survey doesn\'t exist.' });
            }
            // Survey is closed
            if ((survey.active === false) ||
            // Data required by the owner
            (req.user && survey.owner.id === req.user.id) ||
            // Survey is active and results are always public or shown after vote
            (survey.active === true && (survey.public_results || survey.results_after_vote)) ||
            // It's a local request from the server itself
            (req.ip === '127.0.0.1' && (req.host === '127.0.0.1' || req.host === 'localhost'))) {
                survey.getLegend().then(function(legend) {
                    res.json(legend);
                });
            } else {
                res.status(403).json({ error: 'you don\'t have the required permissions.' });
            }
        });
    });

    app.post('/api/survey/:id/results', function(req, res) {
        models.Survey.findById(decryptSurveyId(req.params.id)).then(function(survey) {
            if (survey === null) {
                return res.status(404).json({ error: 'requested survey doesn\'t exist.' });
            }
            if (typeof req.body.responses === undefined) {
                return res.status(400).json({ error: 'you must provide a response to save.' });
            }
            survey.saveResponse(req).catch(function(err) {
                logger.error('Error while saving response for survey with id ' + survey.id + ' : ' + err.message);
                if ('status' in err) {
                    res.status(err.status);
                } else {
                    res.status(500);
                }
                res.json({ error: 'response couldn\'t be saved.' });
            }).lastly(function(response) {
                res.end();
            });
        });
    });

    app.get('/api/survey/:id/export', function(req, res) {
        models.Survey.scope('includeAuthor').findById(decryptSurveyId(req.params.id)).then(function(survey) {
            if (survey === null) {
                return res.status(404).json({ error: 'requested survey doesn\'t exist.' });
            }
            // Survey is closed
            if ((survey.active === false) ||
            // Data required by the owner
            (req.user && survey.owner.id === req.user.id) ||
            // Survey is active and results are always public or shown after vote
            (survey.active === true && (survey.public_results || survey.results_after_vote)) ||
            // It's a local request from the server itself
            (req.ip === '127.0.0.1' && (req.host === '127.0.0.1' || req.host === 'localhost'))) {
                Promise.join(survey.getFullResponses(), survey.getQuestions({
                    scope: 'includeAnswers'
                }), function(responses, questions) {
                    res.attachment(survey.title + '.csv');
                    pgQueryFullResultsToCsv(responses, questions).then(function(csv) {
                        res.send(csv);
                    });
                });
            } else {
                res.status(403).json({ error: 'you don\'t have the required permissions.' });
            }
        });
    });

    // One request per minute limit for full/simple geom requests as data can be
    // quite big
    var baseLayerFullGeomLimiter = new RateLimit({
        windowMs: 60*1000,
        max: 1,
        delayMs: 0,
        handler: function (req, res, next) {
            return res.status(429).json({ warning: "base layer API full/simple geom requests limited to 1 per minute." });
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
                    return res.status(400).json({ error: "requested invalid geom type." });
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
                    return res.status(404).json({ error: "requested layer doesn't exist." });
            }
            sequelize.query(sql, {
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
                    return res.status(400).json({ error: "requested layer is too big for being served as geojson (25 MB max)." });
                }
                res.json(results);
            });
        });
    });

};
