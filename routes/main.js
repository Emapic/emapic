var passport = require('passport'),
    Promise = require('bluebird'),
    nconf = require('nconf'),
    fs = require('fs'),
    logger = require('../utils/logger'),
    sequelize = require('sequelize'),

    defaultPageSize = nconf.get('app').defaultPageSize;
const Op = sequelize.Op;

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
                        [Op.ne]: null
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
        Utils.copyAttributes({
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
        var pageNr = isNaN(req.query.page) ? 1 : req.query.page,
            pageSize = isNaN(req.query.size) ? defaultPageSize : req.query.size;
        req.user.getAnsweredSurveysAndCount({
            limit: pageSize,
            offset: (pageNr - 1) * pageSize
        }).then(function(results) {
            res.render('answered-surveys-list', {
                answered: results.rows,
                pagination: Utils.getPaginationHtml(req, pageNr, pageSize, results.count, 'pagination_total_surveys'),
                layout: 'layouts/main'
            });
        });
    });

    app.get('/surveys/list', function(req, res){
        var query = req.query.q && req.query.q.trim() !== '' ? req.query.q : null,
            order = req.query.order && req.query.order.trim() !== '' ? req.query.order : null,
            pageNr = isNaN(req.query.page) ? 1 : req.query.page,
            pageSize = isNaN(req.query.size) ? defaultPageSize : req.query.size;
        models.Survey.findPublicSurveys(null, null, query, null, order, pageSize, pageNr).then(function(results) {
            res.render('surveys-list', {
                surveys: results.rows,
                pagination: Utils.getPaginationHtml(req, pageNr, pageSize, results.count, 'pagination_total_surveys'),
                query: query,
                layout: 'layouts/main'
            });
        });
    });

    app.get('/surveys/tag/:tag', function(req, res){
        var tag = req.params.tag.trim(),
            order = req.query.order && req.query.order.trim() !== '' ? req.query.order : null,
            pageNr = isNaN(req.query.page) ? 1 : req.query.page,
            pageSize = isNaN(req.query.size) ? defaultPageSize : req.query.size;
        models.Survey.findPublicSurveys(null, null, null, tag, order, pageSize, pageNr).then(function(results) {
            res.render('tag-surveys-list', {
                surveys: results.rows,
                tag: tag,
                pagination: Utils.getPaginationHtml(req, pageNr, pageSize, results.count, 'pagination_total_surveys'),
                layout: 'layouts/main'
            });
        });
    });

    app.get('/surveys/user/:login', function(req, res){
        var userLogin = req.params.login.trim(),
            order = req.query.order && req.query.order.trim() !== '' ? req.query.order : null,
            pageNr = isNaN(req.query.page) ? 1 : req.query.page,
            pageSize = isNaN(req.query.size) ? defaultPageSize : req.query.size,
            user;
        models.User.findByLogin(userLogin).then(function(usr) {
            user = usr;
            return models.Survey.findPublicSurveys(user.id, null, null, null, order, pageSize, pageNr);
        }).then(function(results) {
            res.render('user-surveys-list', {
                surveys: results.rows,
                owner: user,
                pagination: Utils.getPaginationHtml(req, pageNr, pageSize, results.count, 'pagination_total_surveys'),
                layout: 'layouts/main'
            });
        }).catch({ message: 'NULL_USER' }, function(err) {
            return res.redirect('/surveys/list');
        });
    });

    app.get('/surveys/own', requireRole(null), function(req, res) {
        var order = req.query.order && req.query.order.trim() !== '' ? req.query.order : null,
            pageNr = isNaN(req.query.page) ? 1 : req.query.page,
            pageSize = isNaN(req.query.size) ? defaultPageSize : req.query.size;
        models.Survey.findSurveys(req.user.id, false, null, null, null, order, pageSize, pageNr).then(function(results) {
            res.render('own-surveys-list', {
                surveys: results.rows,
                pagination: Utils.getPaginationHtml(req, pageNr, pageSize, results.count, 'pagination_total_surveys'),
                layout: 'layouts/main'
            });
        });
    });

    app.get('/surveys/new', requireRole(null), function(req, res){
        req.user.isAdmin().then(function(isAdmin) {
            res.render('new-survey', {
                layout: 'layouts/survey-form',
                max_lengths: models.Question.maxLengths,
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
                    Utils.copyBodyToLocals(req, res);
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
                models.Survey.findByPk(req.body.survey_id).then(function(surv) {
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
                models.Survey.findByPk(req.body.survey_id).then(function(surv) {
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

    app.get('/survey/:id/delete', requireRole(null), function(req, res) {
        req.user.getSurveys({
            where: {
                id: Utils.decryptSurveyId(req.params.id)
            }
        }).then(function(surveys) {
            if (surveys.length === 0) {
                return Promise.reject();
            }
            return surveys[0].destroy();
        }).then(function() {
            req.session.success = 'survey_deleted_success_msg';
            logger.info('Survey with id ' + Utils.decryptSurveyId(req.params.id) + ' has been deleted successfully.');
        }).catch(function(err) {
            req.session.error = 'survey_deleted_error_msg';
            logger.error('Error while deleting survey with id ' + Utils.decryptSurveyId(req.params.id) + ' : ' + err);
        }).lastly(function() {
            res.redirect('/surveys/own');
        });
    });

    app.get('/survey/:id/open', requireRole(null), function(req, res) {
        req.user.getSurveys({
            where: {
                id: Utils.decryptSurveyId(req.params.id)
            }
        }).then(function(surveys) {
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
            logger.info('Survey with id ' + Utils.decryptSurveyId(req.params.id) + ' has been opened successfully.');
        }).catch(function(err) {
            req.session.error = 'survey_open_error_msg';
            logger.error('Error while opening survey with id ' + Utils.decryptSurveyId(req.params.id) + ' : ' + err);
        }).lastly(function() {
            res.redirect('/surveys/own');
        });
    });

    app.get('/survey/:id/close', requireRole(null), function(req, res) {
        req.user.getSurveys({
            where: {
                id: Utils.decryptSurveyId(req.params.id)
            }
        }).then(function(surveys) {
            if ((surveys.length === 0) || (surveys[0].active === null)) {
                return Promise.reject();
            }
            surveys[0].active = false;
            surveys[0].date_closed = new Date();
            return surveys[0].save();
        }).then(function() {
            req.session.success = 'survey_close_success_msg';
            logger.info('Survey with id ' + Utils.decryptSurveyId(req.params.id) + ' has been closed successfully.');
        }).catch(function(err) {
            req.session.error = 'survey_close_error_msg';
            logger.error('Error while closing survey with id ' + Utils.decryptSurveyId(req.params.id) + ' : ' + err);
        }).lastly(function() {
            res.redirect('/surveys/own');
        });
    });

    app.get('/avatar', requireRole(null), function(req, res){
        if (req.user.avatar === null || req.user.avatar.length === 0) {
            res.contentType("image/png");
            res.send(fs.readFileSync("public/images/default-avatar.png"));
        } else {
            var buffer = Buffer.from(req.user.avatar);
            res.contentType(Utils.getFileMimeType(buffer, 'image/png'));
            res.send(buffer);
        }
    });

    app.get('/avatar/:login', function(req, res){
        models.User.scope({method: ['findByLogin', req.params.login.trim()]}).findOne().then(function(user) {
            if (user === null) {
                return res.send(404);   // HTTP status 404: NotFound
            }
            if (user.avatar === null || user.avatar.length === 0) {
                res.contentType("image/png");
                res.send(fs.readFileSync("public/images/default-avatar.png"));
            } else {
                var buffer = Buffer.from(user.avatar);
                res.contentType(Utils.getFileMimeType(buffer, 'image/png'));
                res.send(buffer);
            }
        });
    });

    app.get('/answer_img/:id', function(req, res){
        models.Answer.findByPk(req.params.id).then(function(answer) {
            if (answer === null || answer.img === null || answer.img.length === 0) {
                return res.send(404);   // HTTP status 404: NotFound
            }
            var buffer = Buffer.from(answer.img);
            res.contentType(Utils.getFileMimeType(buffer, 'image/png'));
            res.send(buffer);
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
