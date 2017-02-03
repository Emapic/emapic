var passport = require('passport'),
    Promise = require('bluebird'),
    fs = require('fs'),
    logger = require('../utils/logger');

var defaultPageSize = 10;

module.exports = function(app) {

    app.get('/login', function(req, res){
        if (req.user) {
            res.redirect('/dashboard');
        } else {
            res.render('login', {layout: 'layouts/main'});
        }
    });

    app.get('/signup', function(req, res){
        if (req.user) {
            res.redirect('/dashboard');
        } else {
            res.render('signup', {layout: 'layouts/main'});
        }
    });

    app.get('/dashboard', requireRole(null), function(req, res){
        Promise.join(req.user.getAnsweredSurveysAndCount({
                limit: 5
            }),
            req.user.getSurveys({
                where: {
                    active: {
                        $ne: null
                    }
                }
            }),
            function(answered, created) {
                res.render('dashboard', {
                    answered: answered.rows,
                    ans_count: answered.count,
                    cre_count: created.length,
                    layout: 'layouts/main'
                });
            }
        );
    });

    app.get('/profile', requireRole(null), function(req, res){
        copyAttributes({
            userFormData: req.user.get()
        }, res.locals);
        res.render('profile', {
            hasPassword: req.user.password !== null,
            hasGoogleId: req.user.google_id !== null,
            hasFacebookId: req.user.facebook_id !== null,
            layout: 'layouts/main'
        });
    });

    app.get('/surveys/answered', requireRole(null), function(req, res){
        var pageNr = isNaN(req.query.page) ? 1 : req.query.page;
        var pageSize = isNaN(req.query.size) ? defaultPageSize : req.query.size;
        req.user.getAnsweredSurveysAndCount({
            limit: pageSize,
            offset: (pageNr - 1) * pageSize
        }).then(function(results) {
            res.render('answered-surveys-list', {
                answered: results.rows,
                pagination: getPaginationHtml(req, pageNr, pageSize, results.count, 'pagination_total_surveys'),
                layout: 'layouts/main'
            });
        });
    });

    app.get('/surveys/list', function(req, res){
        var query = req.query.q;
        var pageNr = isNaN(req.query.page) ? 1 : req.query.page;
        var pageSize = isNaN(req.query.size) ? defaultPageSize : req.query.size;
        var surveys;
        if (query && query.trim() !== '') {
            surveys = models.Survey.scope('includeAuthor', { method: ['publicSearch', query]}).findAndCountAll({
                limit: pageSize,
                offset: (pageNr - 1) * pageSize
            });
        } else {
            surveys = models.Survey.scope('includeAuthor', 'public').findAndCountAll({
                order: [['active', 'DESC'], ['date_opened', 'DESC']],
                limit: pageSize,
                offset: (pageNr - 1) * pageSize
            });
        }
        surveys.then(function(results) {
            res.render('surveys-list', {
                surveys: results.rows,
                pagination: getPaginationHtml(req, pageNr, pageSize, results.count, 'pagination_total_surveys'),
                query: query,
                layout: 'layouts/main'
            });
        });
    });

    app.get('/surveys/tag/:tag', function(req, res){
        if (!req.params.tag) {
            return res.redirect('/');
        }
        var tag = req.params.tag.trim();
        var pageNr = isNaN(req.query.page) ? 1 : req.query.page;
        var pageSize = isNaN(req.query.size) ? defaultPageSize : req.query.size;
        models.Survey.scope('includeAuthor', 'public',  {method: ['filterByTag', tag]}).findAndCountAll({
            order: [['active', 'DESC'], ['date_opened', 'DESC']],
            limit: pageSize,
            offset: (pageNr - 1) * pageSize
        }).then(function(results) {
            res.render('tag-surveys-list', {
                surveys: results.rows,
                tag: tag,
                pagination: getPaginationHtml(req, pageNr, pageSize, results.count, 'pagination_total_surveys'),
                layout: 'layouts/main'
            });
        });
    });

    app.get('/surveys/user/:login', function(req, res){
        if (!req.params.login) {
            return res.redirect('/');
        }
        var userLogin = req.params.login.trim();
        var pageNr = isNaN(req.query.page) ? 1 : req.query.page;
        var pageSize = isNaN(req.query.size) ? defaultPageSize : req.query.size;
        var user;
        models.User.scope({method: ['findByLogin', userLogin]}).findOne().then(function(usr) {
            if (usr === null) {
                return res.redirect('/');
            }
            user = usr;
            models.Survey.scope('includeAuthor', 'public',  {method: ['filterByOwner', user.id]}).findAndCountAll({
                order: [['active', 'DESC'], ['date_opened', 'DESC']],
                limit: pageSize,
                offset: (pageNr - 1) * pageSize
            }).then(function(results) {
                res.render('user-surveys-list', {
                    surveys: results.rows,
                    owner: user,
                    pagination: getPaginationHtml(req, pageNr, pageSize, results.count, 'pagination_total_surveys'),
                    layout: 'layouts/main'
                });
            });
        });
    });

    app.get('/surveys/own', requireRole(null), function(req, res) {
        var pageNr = isNaN(req.query.page) ? 1 : req.query.page;
        var pageSize = isNaN(req.query.size) ? defaultPageSize : req.query.size;
        models.Survey.scope({ method: ['filterByOwner', req.user.id]}).findAndCountAll({
            order: [['active', 'DESC'], ['date_opened', 'DESC'], ['date_created', 'DESC']],
            limit: pageSize,
            offset: (pageNr - 1) * pageSize
        }).then(function(results) {
            res.render('own-surveys-list', {
                surveys: results.rows,
                pagination: getPaginationHtml(req, pageNr, pageSize, results.count, 'pagination_total_surveys'),
                layout: 'layouts/main'
            });
        });
    });

    app.get('/surveys/new', requireRole(null), function(req, res){
        req.user.isAdmin().then(function(isAdmin) {
            res.render('new-survey', {
                layout: 'layouts/survey-form',
                is_admin: isAdmin
            });
        });
    });

    app.post('/surveys/new', requireRole(null), function(req, res){
        req.user.isAdmin().then(function(isAdmin) {
            // Max survey images' file size is 1 MB
            for (var file in req.files) {
                if (req.files[file].size > 1000000) {
                    req.session.error = 'survey_answer_image_file_too_big_msg';
                    copyBodyToLocals(req, res);
                    questionsMap = JSON.stringify(extractQuestionsMapFromRequest(req));
                    return res.render('new-survey', {
                        is_admin: isAdmin,
                        layout: 'layouts/survey-form',
                        questionsMap: questionsMap
                    });
                }
            }
            models.Survey.createFromPost(req).then(function(survey) {
                req.session.success = 'survey_created_success_msg';
                logger.info('Survey with id ' + survey.id + ' has been created successfully.');
                res.redirect('/surveys/own');
            }).catch(function(err) {
                req.session.error = 'survey_created_error_msg';
                logger.error('Error while creating new survey: ' + err);
                res.redirect('/surveys/new');
            });
        });
    });

    app.get('/surveys/edit', requireRole(null), function(req, res){
        return res.redirect('/surveys/own');
    });

    app.post('/surveys/edit', requireRole(null), function(req, res){
        req.user.isAdmin().then(function(isAdmin) {
            if (!('survey_id' in req.body) || isNaN(req.body.survey_id)) {
                return res.redirect('/surveys/own');
            }
            if ('clone_survey' in req.body) {
                // Clone survey
                models.Survey.findById(req.body.survey_id).then(function(surv) {
                    if (surv === null) {
                        return res.redirect('/surveys/own');
                    }
                    return surv.clone(req.user.id);
                }).then(function(surv) {
                    survey = surv;
                    return extractQuestionsMapFromSurvey(survey);
                }).then(function(questionsMap) {
                    req.session.success = 'survey_cloned_success_msg';
                    logger.info('Survey with id ' + req.body.survey_id + ' has been cloned successfully to survey with id ' + survey.id);
                    res.render('edit-survey', {
                        layout: 'layouts/survey-form',
                        is_admin: isAdmin,
                        survey: survey,
                        questionsMap: JSON.stringify(questionsMap)
                    });
                }).catch(function(err) {
                    req.session.error = 'survey_cloned_error_msg';
                    logger.error('Error while cloning survey with id ' + req.body.survey_id + ': ' + err);
                    res.redirect('/surveys/own');
                });
            } else if ('survey_title' in req.body) {
                // Confirm survey edition
                models.Survey.updateFromPost(req).then(function() {
                    req.session.success = 'survey_updated_success_msg';
                    logger.info('Survey with id ' + req.body.survey_id + ' has been updated successfully.');
                }).catch(function(err) {
                    req.session.error = 'survey_updated_error_msg';
                    logger.error('Error while updating survey with id ' + req.body.survey_id + ': ' + err);
                }).lastly(function() {
                    res.redirect('/surveys/own');
                });
            } else {
                // Edit survey
                var survey;
                models.Survey.findById(req.body.survey_id).then(function(surv) {
                    if (surv === null) {
                        return res.redirect('/surveys/own');
                    }
                    survey = surv;
                    return extractQuestionsMapFromSurvey(survey);
                }).then(function(questionsMap) {
                    res.render('edit-survey', {
                        layout: 'layouts/survey-form',
                        is_admin: isAdmin,
                        survey: survey,
                        questionsMap: JSON.stringify(questionsMap)
                    });
                });
            }
        });
    });

    app.get('/survey/:id/delete', function(req, res) {
        req.user.getSurveys({ where: ['id = ?', decryptSurveyId(req.params.id)] }).then(function(surveys) {
            if (surveys.length === 0) {
                return Promise.reject();
            }
            return surveys[0].destroy();
        }).then(function() {
            req.session.success = 'survey_deleted_success_msg';
            logger.info('Survey with id ' + decryptSurveyId(req.params.id) + ' has been deleted successfully.');
        }).catch(function(err) {
            req.session.error = 'survey_deleted_error_msg';
            logger.error('Error while deleting survey with id ' + decryptSurveyId(req.params.id) + ' : ' + err);
        }).lastly(function() {
            res.redirect('/surveys/own');
        });
    });

    app.get('/survey/:id/open', function(req, res) {
        req.user.getSurveys({ where: ['id = ?', decryptSurveyId(req.params.id)] }).then(function(surveys) {
            if ((surveys.length === 0) || (surveys[0].active === false)) {
                return Promise.reject();
            }
            var survey = surveys[0];
            return survey.clearVotes().then(function() {
                survey.active = true;
                survey.date_opened = new Date();
                return survey.save();
            });
        }).then(function() {
            req.session.success = 'survey_open_success_msg';
            logger.info('Survey with id ' + decryptSurveyId(req.params.id) + ' has been opened successfully.');
        }).catch(function(err) {
            req.session.error = 'survey_open_error_msg';
            logger.error('Error while opening survey with id ' + decryptSurveyId(req.params.id) + ' : ' + err);
        }).lastly(function() {
            res.redirect('/surveys/own');
        });
    });

    app.get('/survey/:id/close', function(req, res) {
        req.user.getSurveys({ where: ['id = ?', decryptSurveyId(req.params.id)] }).then(function(surveys) {
            if ((surveys.length === 0) || (surveys[0].active === null)) {
                return Promise.reject();
            }
            surveys[0].active = false;
            surveys[0].date_closed = new Date();
            return surveys[0].save();
        }).then(function() {
            req.session.success = 'survey_close_success_msg';
            logger.info('Survey with id ' + decryptSurveyId(req.params.id) + ' has been closed successfully.');
        }).catch(function(err) {
            req.session.error = 'survey_close_error_msg';
            logger.error('Error while closing survey with id ' + decryptSurveyId(req.params.id) + ' : ' + err);
        }).lastly(function() {
            res.redirect('/surveys/own');
        });
    });

    app.get('/avatar', requireRole(null), function(req, res){
        img_data = req.user.avatar;
        res.contentType("image/png");
        if (img_data === null || img_data.length === 0) {
            res.send(fs.readFileSync("public/images/default-avatar.png"));
        } else {
            res.send(new Buffer(img_data));
        }
    });

    app.get('/avatar/:login', function(req, res){
        models.User.scope({method: ['findByLogin', req.params.login.trim()]}).findOne().then(function(user) {
            if (user === null) {
                return res.send(404);   // HTTP status 404: NotFound
            }
            res.contentType("image/png");
            if (user.avatar === null || user.avatar.length === 0) {
                res.send(fs.readFileSync("public/images/default-avatar.png"));
            } else {
                res.send(new Buffer(user.avatar));
            }
        });
    });

    app.get('/answer_img/:id', function(req, res){
        models.Answer.findById(req.params.id).then(function(answer) {
            if (answer === null || answer.img === null || answer.img.length === 0) {
                return res.send(404);   // HTTP status 404: NotFound
            }
            res.contentType("image/png");
            res.send(new Buffer(answer.img));
        });
    });

    app.get('/thumbnails/survey/:size/:id', function(req, res){
        try {
            var img = fs.readFileSync('thumbnails/survey/' + req.params.size.trim() + '/' + req.params.id.trim() + '.png');
            res.contentType("image/png");
            res.send(img);
        } catch (e) {
            try {
                var imgDefault = fs.readFileSync('thumbnails/survey/' + req.params.size.trim() + '/default.png');
                res.contentType("image/png");
                res.send(imgDefault);
            } catch (err) {
                return res.send(404);   // HTTP status 404: NotFound
            }
        }
    });

    app.get('/', function(req, res) {
        res.render('emapic-index', {layout: 'layouts/main'});
    });
};
