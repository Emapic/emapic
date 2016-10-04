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

	app.get('/api/baselayer/:id', function(req, res) {
        var layerId = req.params.id;
		var client = new pg.Client(conString);

        sequelize.query("SELECT 'SELECT ' || array_to_string(array_prepend('st_asgeojson(geom) as geojson', " +
            "ARRAY(SELECT c.column_name::varchar FROM information_schema.columns As c " +
            "WHERE table_schema = 'base_layers' AND table_name = :table AND c.column_name NOT IN('geom', 'gid') " +
            "AND c.column_name NOT IN (SELECT kcu.column_name FROM information_schema.table_constraints AS tc " +
            "JOIN information_schema.key_column_usage AS kcu USING (constraint_schema, constraint_name) JOIN " +
            "information_schema.constraint_column_usage AS ccu USING (constraint_schema, constraint_name) " +
            "WHERE constraint_type = 'FOREIGN KEY' AND tc.table_name=:table AND tc.table_schema='base_layers'))), ', ') " +
            "|| ' FROM base_layers.' || :table As sqlstmt;", {
            replacements: { table: layerId },
            type: sequelize.QueryTypes.SELECT
        }).then(function(results) {
            return sequelize.query(results[0].sqlstmt, {
                type: sequelize.QueryTypes.SELECT
            });
        }).then(function(rows) {
            var json = postGISQueryToFeatureCollection(rows),
                size = Buffer.byteLength(JSON.stringify(json));
            if (size > 25000000) {
                res.status(404).json({ error: "layer is too big for being served as geojson." });
                return logger.warn("Layer ''" + layerId + "' is too big to serve it as geojson.");
            }
            res.json(json);
        }).catch(function(err) {
            res.status(500).json({ error: "couldn't retrieve layer." });
            if (err.message.indexOf('does not exist') > -1) {
                logger.warn("Requested base layer '" + layerId + "' does not exist.");
            } else {
                logger.error("Error while retrieving base layer '" + layerId + "': " + err);
            }
        });
	});

    app.get('/api/baselayers/countries', function(req, res) {
        sequelize.query("SELECT lower(iso_code_2) AS iso_code, name, st_asgeojson(geom) as geojson FROM base_layers.countries WHERE iso_code_2 IS NOT NULL ORDER BY iso_code;",
            { type: sequelize.QueryTypes.SELECT }).then(function(responses) {
            if (!responses) {
                return res.json([]);
            }
            res.json(postGISQueryToFeatureCollection(responses));
        });
    });

    app.get('/api/baselayers/countries/bbox', function(req, res) {
        sequelize.query("SELECT lower(iso_code_2) AS iso_code, name, st_asgeojson(st_envelope(geom)) as geojson FROM base_layers.countries WHERE iso_code_2 IS NOT NULL ORDER BY iso_code;",
            { type: sequelize.QueryTypes.SELECT }).then(function(responses) {
            if (!responses) {
                return res.json([]);
            }
            res.json(postGISQueryToFeatureCollection(responses));
        });
    });

    app.get('/api/baselayers/countries/nogeom', function(req, res) {
        sequelize.query("SELECT lower(iso_code_2) AS iso_code, name FROM base_layers.countries WHERE iso_code_2 IS NOT NULL ORDER BY iso_code;",
            { type: sequelize.QueryTypes.SELECT }).then(function(responses) {
            if (!responses) {
                return res.json([]);
            }
            res.json(responses);
        });
    });

    app.get('/api/baselayers/provinces', function(req, res) {
        sequelize.query("SELECT gns_adm1 AS country_id, iso_3166_2 AS iso_code, adm1_code as adm_code, name, type_en AS type, lower(iso_a2) AS country_iso_code, st_asgeojson(geom) as geojson FROM base_layers.provinces WHERE iso_a2 IS NOT NULL ORDER BY country_id;",
            { type: sequelize.QueryTypes.SELECT }).then(function(responses) {
            if (!responses) {
                return res.json([]);
            }
            res.json(postGISQueryToFeatureCollection(responses));
        });
    });

    app.get('/api/baselayers/provinces/bbox', function(req, res) {
        sequelize.query("SELECT gns_adm1 AS country_id, iso_3166_2 AS iso_code, adm1_code as adm_code, name, type_en AS type, lower(iso_a2) AS country_iso_code, st_asgeojson(st_envelope(geom)) as geojson FROM base_layers.provinces WHERE iso_a2 IS NOT NULL ORDER BY country_id;",
            { type: sequelize.QueryTypes.SELECT }).then(function(responses) {
            if (!responses) {
                return res.json([]);
            }
            res.json(postGISQueryToFeatureCollection(responses));
        });
    });

    app.get('/api/baselayers/provinces/nogeom', function(req, res) {
        sequelize.query("SELECT gns_adm1 AS country_id, iso_3166_2 AS iso_code, adm1_code as adm_code, name, type_en AS type, lower(iso_a2) AS country_iso_code FROM base_layers.provinces WHERE iso_a2 IS NOT NULL ORDER BY country_id;",
            { type: sequelize.QueryTypes.SELECT }).then(function(responses) {
            if (!responses) {
                return res.json([]);
            }
            res.json(responses);
        });
    });

};
