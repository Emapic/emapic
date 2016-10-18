var Promise = require('bluebird'),
    bases = require('bases'),
    logger = require('../utils/logger'),
    nconf = require('nconf'),
    emapicOpinionFreq = parseFloat(nconf.get('app').emapicOpinionFreq),
    sequelize = models.sequelize;

module.exports = function(app) {

    app.get('/survey/:id', function(req, res) {
        models.Survey.findById(decryptSurveyId(req.params.id)).then(function(survey) {
            if (survey === null) {
                return res.redirect('/');
            }
            survey.getOwner().then(function(owner){
                // Survey is in draft mode and it's not being tested by its owner
                if ((survey.active === null) && (!req.user || (owner.id != req.user.id))) {
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
                }).done();
            });
        });
    });

    app.get('/survey/:id/results', function(req, res) {
        models.Survey.findById(decryptSurveyId(req.params.id)).then(function(survey) {
            if (survey === null) {
                return res.redirect('/');
            }
            survey.getOwner().then(function(owner){
                // Survey is closed
                if ((survey.active === false) ||
                // Data required by the owner
                (req.user && owner.id == req.user.id) ||
                // Results are always public
                survey.public_results ||
                // It's a local request from the server itself
                (req.ip == '127.0.0.1' && (req.host == '127.0.0.1' || req.host == 'localhost'))) {
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
                            emapicOpinion : (Math.random() < 0.2),
                            layout : 'layouts/map'
                        });
                    }).done();
                }
                return res.redirect('/survey/' + req.params.id);
            });
        });
    });

    app.get('/api/survey/:id/results', function(req, res) {
        models.Survey.findById(decryptSurveyId(req.params.id)).then(function(survey) {
            if (survey === null) {
                return res.end();
            }
            survey.getOwner().then(function(owner) {
                // Survey is closed
                if ((survey.active === false) ||
                // Data required by the owner
                (req.user && owner.id == req.user.id) ||
                // Results are always public
                survey.public_results ||
                // Results after vote
                survey.results_after_vote ||
                // It's a local request from the server itself
                (req.ip == '127.0.0.1' && (req.host == '127.0.0.1' || req.host == 'localhost'))) {
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
                    res.end();
                }
            });
        });
    });

    app.get('/api/survey/:id/totals', function(req, res) {
        models.Survey.findById(decryptSurveyId(req.params.id)).then(function(survey) {
            if (survey === null) {
                return res.end();
            }
            survey.getOwner().then(function(owner) {
                // Survey is closed
                if ((survey.active === false) ||
                // Data required by the owner
                (req.user && owner.id == req.user.id) ||
                // Results are always public
                survey.public_results ||
                // Results after vote
                survey.results_after_vote ||
                // It's a local request from the server itself
                (req.ip == '127.0.0.1' && (req.host == '127.0.0.1' || req.host == 'localhost'))) {
                    survey.getTotals().then(function(response) {
                        res.json(response);
                    });
                } else {
                    res.end();
                }
            });
        });
    });

    app.get('/api/survey/:id/totals/provinces', function(req, res) {
        models.Survey.findById(decryptSurveyId(req.params.id)).then(function(survey) {
            if (survey === null) {
                return res.end();
            }
            survey.getOwner().then(function(owner) {
                // Survey is closed
                if ((survey.active === false) ||
                // Data required by the owner
                (req.user && owner.id == req.user.id) ||
                // Results are always public
                survey.public_results ||
                // Results after vote
                survey.results_after_vote ||
                // It's a local request from the server itself
                (req.ip == '127.0.0.1' && (req.host == '127.0.0.1' || req.host == 'localhost'))) {
                    Promise.join(survey.getProvinceTotals(), survey.getQuestions({
                        scope: 'includeAnswers'
                    }), function(responses, questions) {
                        if (!responses) {
                            return res.json([]);
                        }
                        var answers = [];
                        for (var i = 0, iLen = questions.length; i<iLen; i++) {
                            answers.push(questions[i].Answers);
                        }
                        res.json(postGISQueryToFeatureCollection(addAggregatedVotesPopupMessage(responses, questions, answers)));
                    });
                } else {
                    res.end();
                }
            });
        });
    });

    app.get('/api/survey/:id/totals/provinces/bbox', function(req, res) {
        models.Survey.findById(decryptSurveyId(req.params.id)).then(function(survey) {
            if (survey === null) {
                return res.end();
            }
            survey.getOwner().then(function(owner) {
                // Survey is closed
                if ((survey.active === false) ||
                // Data required by the owner
                (req.user && owner.id == req.user.id) ||
                // Results are always public
                survey.public_results ||
                // Results after vote
                survey.results_after_vote ||
                // It's a local request from the server itself
                (req.ip == '127.0.0.1' && (req.host == '127.0.0.1' || req.host == 'localhost'))) {
                    survey.getProvinceTotalsBbox().then(function(responses) {
                        if (!responses) {
                            return res.json([]);
                        }
                        res.json(postGISQueryToFeatureCollection(responses));
                    });
                } else {
                    res.end();
                }
            });
        });
    });

    app.get('/api/survey/:id/totals/provinces/nogeom', function(req, res) {
        models.Survey.findById(decryptSurveyId(req.params.id)).then(function(survey) {
            if (survey === null) {
                return res.end();
            }
            survey.getOwner().then(function(owner) {
                // Survey is closed
                if ((survey.active === false) ||
                // Data required by the owner
                (req.user && owner.id == req.user.id) ||
                // Results are always public
                survey.public_results ||
                // Results after vote
                survey.results_after_vote ||
                // It's a local request from the server itself
                (req.ip == '127.0.0.1' && (req.host == '127.0.0.1' || req.host == 'localhost'))) {
                    survey.getProvinceTotalsNoGeom().then(function(responses) {
                        if (!responses) {
                            return res.json([]);
                        }
                        res.json(responses);
                    });
                } else {
                    res.end();
                }
            });
        });
    });

    app.get('/api/survey/:id/totals/countries', function(req, res) {
        models.Survey.findById(decryptSurveyId(req.params.id)).then(function(survey) {
            if (survey === null) {
                return res.end();
            }
            survey.getOwner().then(function(owner) {
                // Survey is closed
                if ((survey.active === false) ||
                // Data required by the owner
                (req.user && owner.id == req.user.id) ||
                // Results are always public
                survey.public_results ||
                // Results after vote
                survey.results_after_vote ||
                // It's a local request from the server itself
                (req.ip == '127.0.0.1' && (req.host == '127.0.0.1' || req.host == 'localhost'))) {
                    Promise.join(survey.getCountryTotals(), survey.getQuestions({
                        scope: 'includeAnswers'
                    }), function(responses, questions) {
                        if (!responses) {
                            return res.json([]);
                        }
                        var answers = [];
                        for (var i = 0, iLen = questions.length; i<iLen; i++) {
                            answers.push(questions[i].Answers);
                        }
                        res.json(postGISQueryToFeatureCollection(addAggregatedVotesPopupMessage(responses, questions, answers)));
                    });
                } else {
                    res.end();
                }
            });
        });
    });

    app.get('/api/survey/:id/totals/countries/bbox', function(req, res) {
        models.Survey.findById(decryptSurveyId(req.params.id)).then(function(survey) {
            if (survey === null) {
                return res.end();
            }
            survey.getOwner().then(function(owner) {
                // Survey is closed
                if ((survey.active === false) ||
                // Data required by the owner
                (req.user && owner.id == req.user.id) ||
                // Results are always public
                survey.public_results ||
                // Results after vote
                survey.results_after_vote ||
                // It's a local request from the server itself
                (req.ip == '127.0.0.1' && (req.host == '127.0.0.1' || req.host == 'localhost'))) {
                    survey.getCountryTotalsBbox().then(function(responses) {
                        if (!responses) {
                            return res.json([]);
                        }
                        res.json(postGISQueryToFeatureCollection(responses));
                    });
                } else {
                    res.end();
                }
            });
        });
    });

    app.get('/api/survey/:id/totals/countries/nogeom', function(req, res) {
        models.Survey.findById(decryptSurveyId(req.params.id)).then(function(survey) {
            if (survey === null) {
                return res.end();
            }
            survey.getOwner().then(function(owner) {
                // Survey is closed
                if ((survey.active === false) ||
                // Data required by the owner
                (req.user && owner.id == req.user.id) ||
                // Results are always public
                survey.public_results ||
                // Results after vote
                survey.results_after_vote ||
                // It's a local request from the server itself
                (req.ip == '127.0.0.1' && (req.host == '127.0.0.1' || req.host == 'localhost'))) {
                    survey.getCountryTotalsNoGeom().then(function(responses) {
                        if (!responses) {
                            return res.json([]);
                        }
                        res.json(responses);
                    });
                } else {
                    res.end();
                }
            });
        });
    });

    app.get('/api/survey/:id/legend', function(req, res) {
        models.Survey.findById(decryptSurveyId(req.params.id)).then(function(survey) {
            if (survey === null) {
                return res.end();
            }
            survey.getOwner().then(function(owner) {
                // Survey is closed
                if ((survey.active === false) ||
                // Data required by the owner
                (req.user && owner.id == req.user.id) ||
                // Results are always public
                survey.public_results ||
                // Results after vote
                survey.results_after_vote ||
                // It's a local request from the server itself
                (req.ip == '127.0.0.1' && (req.host == '127.0.0.1' || req.host == 'localhost'))) {
                    survey.getLegend().then(function(legend) {
                        res.json(legend);
                    });
                } else {
                    res.end();
                }
            });
        });
    });

    app.post('/api/survey/:id/results', function(req, res) {
        models.Survey.findById(decryptSurveyId(req.params.id)).then(function(survey) {
            if (survey === null || (typeof req.body.responses === undefined)) {
                return res.end();
            }
            survey.saveResponse(req).catch(function(err) {
                logger.error('Error while saving survey response: ' + err);
            }).lastly(function(response) {
                res.end();
            });
        });
    });

    app.get('/api/survey/:id/export', function(req, res) {
        models.Survey.findById(decryptSurveyId(req.params.id)).then(function(survey) {
            if (survey === null) {
                return res.end();
            }
            survey.getOwner().then(function(owner) {
                // Survey is closed
                if ((survey.active === false) ||
                // Data required by the owner
                (req.user && owner.id == req.user.id) ||
                // Results are always public
                survey.public_results ||
                // Results after vote
                survey.results_after_vote ||
                // It's a local request from the server itself
                (req.ip == '127.0.0.1' && (req.host == '127.0.0.1' || req.host == 'localhost'))) {
                    Promise.join(survey.getFullResponses(), survey.getQuestions({
                        scope: 'includeAnswers'
                    }), function(responses, questions) {
                        res.attachment(survey.title + '.csv');
                        pgQueryFullResultsToCsv(responses, questions).then(function(csv) {
                            res.send(csv);
                        });
                    });
                } else {
                    res.end();
                }
            });
        });
    });

    app.get('/api/baselayers/:layer', function(req, res) {
        var layer = req.params.layer,
            params = req.query,
            sql,
            where = [],
            geom = ', st_asgeojson(geom) as geojson',
            replacements = {},
            namePromise;
        if ('geom' in params) {
            switch (params.geom) {
                case 'full':
                    break;
                case 'bbox':
                    geom = ', st_asgeojson(st_envelope(geom)) as geojson';
                    break;
                case 'centroid':
                    geom = ', st_asgeojson(st_centroid(geom)) as geojson';
                    break;
                case 'none':
                    geom = '';
                    break;
                default:
                    logger.info("Requested invalid geom type '" + params.geom + "' for base layer '" + layer + "'.");
                    return res.status(404).json({ error: "requested invalid geom type." });
            }
        }
        if ('lang' in params) {
            namePromise = checkColumnExists('name_' + params.lang, layer, 'base_layers').then(function(result) {
                return (result[0].exists) ? 'name_' + params.lang : 'name';
            });
        } else {
            namePromise = Promise.resolve('name');
        }
        namePromise.then(function(nameCol) {
            switch (layer) {
                case 'provinces':
                    if ('country' in params) {
                        where.push('lower(iso_a2) = lower(:country)');
                        replacements.country = params.country;
                    }
                    sql = 'SELECT diss_me AS province_id, iso_3166_2 AS iso_code, adm1_code as adm_code, ' + nameCol + ' AS name, type_en AS type, lower(iso_a2) AS country_iso_code' + geom + ' FROM base_layers.provinces' + (where.length > 0 ? ' WHERE ' + where.join(' AND ') : '') + ' ORDER BY adm_code;';
                    break;
                case 'countries':
                    where.push('iso_code_2 IS NOT NULL');
                    sql = 'SELECT lower(iso_code_2) AS iso_code, ' + nameCol + ' AS name' + geom + ' FROM base_layers.countries' + (where.length > 0 ? ' WHERE ' + where.join(' AND ') : '') + ' ORDER BY iso_code;';
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
                    logger.warn("Requested layer '" + layer + "' with " + (('geom' in params) ? params.geom : 'full') + " geom, which is too big for being served as geojson (" + size + " MB).");
                    return res.status(404).json({ error: "requested layer is too big for being served as geojson." });
                }
                res.json(results);
            });
        });
    });

};
