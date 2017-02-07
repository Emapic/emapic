var fs = require('fs'),
    escape = require('escape-html'),
    Promise = require('bluebird'),
    linkifyHtml = require('linkifyjs/html');

module.exports = function(sequelize, DataTypes) {
    var Question = sequelize.define('Question', {
        id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
        type: { type: DataTypes.STRING, allowNull: false, defaultValue: 'text' },
        title: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
        question: { type: DataTypes.STRING, allowNull: false },
        mandatory: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        legend_question: { type: DataTypes.STRING, allowNull: true },
        question_order: { type: DataTypes.INTEGER, allowNull: false },
        language: { type: DataTypes.STRING, allowNull: false, defaultValue: 'es' }
    }, {
        scopes: {
            ordered: function() {
                return {
                    order: Question.getDefaultOrder()
                };
            }
        },
        classMethods: {
            getDefaultOrder: function() {
                return ['question_order'];
            },

            associate: function(models) {
                // Scope must be added here because models.Answer must be already defined
                Question.addScope('includeAnswers', {
                    include: [models.Answer],
                    order: Question.getDefaultOrder().concat(models.Answer.getDefaultOrder())
                });
                Question.belongsTo(models.Survey, {foreignKey: 'survey_id'});
                models.Survey.hasMany(Question.scope('ordered'), {foreignKey: 'survey_id'});
            },

            createFromPost: function(req, survey) {
                var questionsData = [];
                for (var i = 1; true; i++) {
                    if (!(('question_type_' + i) in req.body) || !(('question_' + i) in req.body)) {
                        break;
                    }
                    var questionType = req.body['question_type_' + i].trim();
                    if (questionType === '') {
                        continue;
                    }
                    switch (questionType) {
                        case 'list-radio':
                            if (req.body['question_' + i].trim() === '' ||
                                !(('option_' + i + '_1') in req.body) ||
                                !(('option_' + i + '_1_color') in req.body)) {
                                break;
                            }
                            questionsData.push({
                                survey_id : survey.id,
                                type : (('responses_' + i + '_other') in req.body) ? 'list-radio-other' : 'list-radio',
                                question : (req.body['question_' + i] ? req.body['question_' + i].substring(0, 150).trim() : null),
                                question_order : i - 1,
                                legend_question : 'color'
                            });
                            break;
                        case 'text-answer':
                        case 'image-url':
                            if (req.body['question_' + i].trim() === '') {
                                break;
                            }
                            questionsData.push({
                                survey_id : survey.id,
                                type : questionType,
                                question : (req.body['question_' + i] ? req.body['question_' + i].substring(0, 150).trim() : null),
                                question_order : i - 1
                            });
                            break;
                        case 'explanatory-text':
                            if (req.body['question_' + i].trim() === '') {
                                break;
                            }
                            questionsData.push({
                                survey_id : survey.id,
                                type : questionType,
                                question : (req.body['question_' + i] ? req.body['question_' + i].substring(0, 1000).trim() : null),
                                question_order : i - 1
                            });
                            break;
                        default:
                            return new Error("Question type not contemplated.");
                    }
                }
                return Promise.map(questionsData, function(questionData) {
                    return Question.create(questionData);
                }).then(function(questions) {
                    var answers = [];
                    for (var i = 1, iLen = questions.length; i<=iLen; i++) {
                        var question = questions[i-1];
                        switch(question.type) {
                            case 'list-radio':
                            case 'list-radio-other':
                                for (var j = 1; true; j++) {
                                    if (!(('option_' + i + '_' + j) in req.body) || req.body['option_' + i + '_' + j].trim() === '') {
                                        break;
                                    }
                                    answers.push({
                                        question_id : question.id,
                                        answer : (req.body['option_' + i + '_' + j] ? req.body['option_' + i + '_' + j].substring(0, 150).trim() : null),
                                        sortorder : j - 1,
                                        legend : req.body['option_' + i + '_' + j + '_color'],
                                        img : req.files['img_' + i + '_' + j] && req.files['img_' + i + '_' + j].size ? fs.readFileSync(req.files['img_' + i + '_' + j].path) : null
                                    });
                                }
                                if (('responses_' + i + '_other') in req.body) {
                                    answers.push({
                                        question_id : question.id,
                                        answer : (req.body['option_' + i + '_other'] ? req.body['option_' + i + '_other'].substring(0, 150).trim() : null),
                                        sortorder : -1,
                                        legend : req.body['option_' + i + '_other_color'],
                                        img : req.files['img_' + i + '_other'] && req.files['img_' + i + '_other'].size ? fs.readFileSync(req.files['img_' + i + '_other'].path) : null
                                    });
                                }
                                break;
                            case 'text-answer':
                            case 'explanatory-text':
                            case 'image-url':
                                // These question types have no predefined answers
                                break;
                            default:
                                return new Error("Question type not contemplated.");
                        }
                    }
                    return models.Answer.bulkCreate(answers).return(questions);
                });
            },

            updateFromPost: function(req, survey) {
                var oldQuestions, oldAnswers = [];
                // We retrieve previous survey questions
                return survey.getQuestions({
                    scope: 'includeAnswers'
                }).then(function(questions) {
                    oldQuestions = questions;
                    for (var i = 0, iLen = oldQuestions.length; i<iLen; i++) {
                        oldAnswers.push(oldQuestions[i].Answers);
                    }
                    return Promise.map(oldQuestions, function(question) {
                        // We destroy previous survey questions + answers
                        return question.destroy();
                    });
                }).then(function() {
                    var questions = [];
                    for (var i = 1; true; i++) {
                        if (!(('question_type_' + i) in req.body) || !(('question_' + i) in req.body)) {
                            break;
                        }
                        var questionType = req.body['question_type_' + i].trim();
                        if (questionType === '') {
                            continue;
                        }
                        switch (questionType) {
                            case 'list-radio':
                                if (req.body['question_' + i].trim() === '' ||
                                    !(('option_' + i + '_1') in req.body) ||
                                    !(('option_' + i + '_1_color') in req.body)) {
                                    break;
                                }
                                questions.push({
                                    survey_id : survey.id,
                                    type : (('responses_' + i + '_other') in req.body) ? 'list-radio-other' : 'list-radio',
                                    question : (req.body['question_' + i] ? req.body['question_' + i].substring(0, 150).trim() : null),
                                    question_order : i - 1,
                                    legend_question : 'color'
                                });
                                break;
                            case 'text-answer':
                            case 'image-url':
                                if (req.body['question_' + i].trim() === '') {
                                    break;
                                }
                                questions.push({
                                    survey_id : survey.id,
                                    type : questionType,
                                    question : (req.body['question_' + i] ? req.body['question_' + i].substring(0, 150).trim() : null),
                                    question_order : i - 1
                                });
                                break;
                            case 'explanatory-text':
                                if (req.body['question_' + i].trim() === '') {
                                    break;
                                }
                                questions.push({
                                    survey_id : survey.id,
                                    type : questionType,
                                    question : (req.body['question_' + i] ? req.body['question_' + i].substring(0, 1000).trim() : null),
                                    question_order : i - 1
                                });
                                break;
                            default:
                                return new Error("Question type not contemplated.");
                        }
                    }
                    return Promise.map(questions, function(question) {
                        return Question.create(question);
                    });
                }).then(function(questions) {
                    var answers = [];
                    for (var i = 1, iLen = questions.length; i<=iLen; i++) {
                        var question = questions[i-1];
                        switch(question.type) {
                            case 'list-radio':
                            case 'list-radio-other':
                                for (var j = 1; true; j++) {
                                    if (!(('option_' + i + '_' + j) in req.body) || req.body['option_' + i + '_' + j].trim() === '') {
                                        break;
                                    }
                                    var answerImg = null;
                                    if (req.files['img_' + i + '_' + j]) {
                                        if (req.files['img_' + i + '_' + j].size) {
                                            // If a file was uploaded, we use it
                                            answerImg = fs.readFileSync(req.files['img_' + i + '_' + j].path);
                                        } else {
                                            // If not, we recycle the image previously used for this answer
                                            if (!isNaN(req.body['id_' + i + '_' + j])) {
                                                var originalId = parseInt(req.body['id_' + i + '_' + j]);
                                                questions:
                                                for (var k = 0, kLen = oldAnswers.length; k<kLen; k++) {
                                                    for (var l = 0, lLen = oldAnswers[k].length; l<lLen; l++) {
                                                        if (oldAnswers[k][l].id == originalId) {
                                                            answerImg = oldAnswers[k][l].img;
                                                            break questions;
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                    answers.push({
                                        question_id : question.id,
                                        answer : (req.body['option_' + i + '_' + j] ? req.body['option_' + i + '_' + j].substring(0, 150).trim() : null),
                                        sortorder : j - 1,
                                        legend : req.body['option_' + i + '_' + j + '_color'],
                                        img : answerImg
                                    });
                                }
                                if (('responses_' + i + '_other') in req.body) {
                                    var answerOtherImg = null;
                                    if (req.files['img_' + i + '_other']) {
                                        if (req.files['img_' + i + '_other'].size) {
                                            // If a file was uploaded, we use it
                                            answerOtherImg = fs.readFileSync(req.files['img_' + i + '_other'].path);
                                        } else {
                                            // If not, we recycle the image previously used for this answer
                                            if (!isNaN(req.body['id_' + i + '_other'])) {
                                                var originalOtherId = parseInt(req.body['id_' + i + '_other']);
                                                questions:
                                                for (var m = 0, mLen = oldAnswers.length; m<mLen; m++) {
                                                    for (var n = 0, nLen = oldAnswers[m].length; n<nLen; n++) {
                                                        if (oldAnswers[m][n].id == originalOtherId) {
                                                            answerOtherImg = oldAnswers[m][n].img;
                                                            break questions;
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                    answers.push({
                                        question_id : question.id,
                                        answer : (req.body['option_' + i + '_other'] ? req.body['option_' + i + '_other'].substring(0, 150).trim() : null),
                                        sortorder : -1,
                                        legend : req.body['option_' + i + '_other_color'],
                                        img : answerOtherImg
                                    });
                                }
                                break;
                            case 'text-answer':
                            case 'explanatory-text':
                            case 'image-url':
                                // These question types have no predefined answers
                                break;
                            default:
                                return new Error("Question type not contemplated.");
                        }
                    }
                    return models.Answer.bulkCreate(answers).return(questions);
                });
            }
        },
        instanceMethods: {
            getDdlSql: function() {
                switch (this.type) {
                    case 'list-radio-other':
                        return "q" + this.question_order + " text NOT NULL, q" + this.question_order + "_other text";
                    case 'list-radio':
                    case 'text-answer':
                    case 'image-url':
                        return "q" + this.question_order + " text NOT NULL";
                    case 'explanatory-text':
                        return "";
                    default:
                        return new Error("Question type not contemplated.");
                }
            },

            getSelectSql: function() {
                switch (this.type) {
                    case 'list-radio-other':
                        return 'a.q' + this.question_order + ' AS "q' + this.question_order + '.id", a.q' + this.question_order + '_other AS "q' + this.question_order + '.value"';
                    case 'list-radio':
                        return 'a.q' + this.question_order + ' AS "q' + this.question_order + '.id"';
                    case 'text-answer':
                    case 'image-url':
                        return 'a.q' + this.question_order + ' AS "q' + this.question_order + '.value"';
                    case 'explanatory-text':
                        return '';
                    default:
                        return new Error("Question type not contemplated.");
                }
            },

            checkValidResponse: function(responses) {
                var question = this;
                if (typeof this.Answers !== 'undefined') {
                    // Answers have been eagerly loaded
                    promise = Promise.resolve(this.Answers);
                } else {
                    // We must retrieve the answers
                    promise = this.getAnswers();
                }
                return promise.then(function(answers) {
                    var answer = null;
                    switch (question.type) {
                        case 'list-radio-other':
                            if (('q' + question.question_order + '.id') in responses) {
                                answer = responses['q' + question.question_order + '.id'];
                                if (answer == -1 && ('q' + question.question_order + '.value') in responses &&
                                responses['q' + question.question_order + '.value'].trim() !== '') {
                                    return Promise.resolve();
                                }
                            }
                            /* falls through */
                        case 'list-radio':
                            if (('q' + question.question_order + '.id') in responses) {
                                answer = responses['q' + question.question_order + '.id'];
                                for (var i = 0, len = answers.length; i<len; i++) {
                                    if (answers[i].sortorder == answer) {
                                        return Promise.resolve();
                                    }
                                }
                            }
                            break;
                        case 'text-answer':
                            if (('q' + question.question_order + '.value') in responses) {
                                return Promise.resolve();
                            }
                            break;
                        case 'explanatory-text':
                            return Promise.resolve();
                        case 'image-url':
                            if (('q' + question.question_order + '.value') in responses) {
                                answer = responses['q' + question.question_order + '.value'];
                                if (answer.lastIndexOf('http', 0) !== 0) {
                                    responses['q' + question.question_order + '.value'] = answer = 'http://' + answer;
                                }
                                return checkUrlIsImage(responses['q' + question.question_order + '.value']);
                            }
                            break;
                        default:
                            return Promise.reject({
                                message: "Question type not contemplated.",
                                status: 500
                            });
                    }
                    return Promise.reject({
                        message: "Invalid answer for question nr " + question.question_order + " / id " + question.id + ": " + answer,
                        status: 400
                    });
                });
            },

            getInsertSql: function(responses) {
                switch (this.type) {
                    case 'list-radio-other':
                        if ('q' + this.question_order + '.id' in responses) {
                            if (responses['q' + this.question_order + '.id'] == -1) {
                                if ('q' + this.question_order + '.value' in responses) {
                                    return ['q' + this.question_order + ', q' + this.question_order + '_other', '?, ?', [responses['q' + this.question_order + '.id'], responses['q' + this.question_order + '.value']]];
                                }
                            } else {
                                return ['q' + this.question_order, '?', [responses['q' + this.question_order + '.id']]];
                            }
                        }
                        break;
                    case 'list-radio':
                        if ('q' + this.question_order + '.id' in responses) {
                            return ['q' + this.question_order, '?', [responses['q' + this.question_order + '.id']]];
                        }
                        break;
                    case 'text-answer':
                    case 'image-url':
                        if ('q' + this.question_order + '.value' in responses) {
                            return ['q' + this.question_order, '?', [responses['q' + this.question_order + '.value']]];
                        }
                        break;
                    case 'explanatory-text':
                        return ['', '', []];
                    default:
                        return new Error("Question type not contemplated.");
                }
                return new Error("Question fields have not been sent: q" + this.question_order);
            },

            clone: function(surveyId) {
                var originalQuestion = this,
                    newQuestion,
                    props = extractProperties(originalQuestion, ['id', 'survey_id']),
                    promise;
                props.survey_id = surveyId;
                if (typeof originalQuestion.Answers !== 'undefined') {
                    // Answers have been eagerly loaded
                    promise = Promise.resolve(originalQuestion.Answers);
                } else {
                    // We must retrieve the answers
                    promise = originalQuestion.getAnswers();
                }
                return promise.then(function(answers){
                    return Question.create(props).then(function(question) {
                        return Promise.map(answers, function(answer) {
                            return answer.clone(question.id);
                        });
                    });
                });
            },

            getHtml: function() {
                var parent = this,
                    promise;
                switch (parent.type) {
                    case 'list-radio':
                    case 'list-radio-other':
                        if (typeof parent.Answers !== 'undefined') {
                            // Answers have been eagerly loaded
                            promise = Promise.resolve(parent.Answers);
                        } else {
                            // We must retrieve the answers
                            promise = parent.getAnswers();
                        }
                        return promise.then(
                            function(answers){
                                var html = '<div class="main-question" id="question-' + parent.question_order + '">\n<h2>' + escape(parent.question) + '</h2>\n';
                                switch (parent.type) {
                                    case 'list-radio':
                                        if (answers.length > 2) {
                                            html += '<div class="listbtns row">\n';
                                            // If we have more than two answers, we display them in a vertical list
                                            for (var i = 0, iLen = answers.length; i < iLen; i++) {
                                                if (answers[i].img !== null && answers[i].img.length > 0) {
                                                    // If we have an image for the answer, we display it inside a box with the legend color left of the answer's text
                                                    html += '<div class="col-xs-12 text-left"><button id="btn-q' + parent.question_order + '-a' + answers[i].sortorder +
                                                        '" type="button" class="col-xs-12 btn btn-lg survey-answer outlined-text answer-with-image" value="' + escape(answers[i].answer) +
                                                        '" onclick="emapic.modules.survey.addAnswer(\'q' + parent.question_order + '\', \'btn-q' + parent.question_order + '-a' + answers[i].sortorder +
                                                        '\', \'' + answers[i].sortorder + '\')"' + ((parent.legend_question == 'color' && answers[i].legend !== null) ?
                                                        (' style="border-color: ' + escape(answers[i].legend) + '"') : '' ) + '><div class="flex-container">' +
                                                        '<div class="answer-img" style="background-image: url(\'/answer_img/' + answers[i].id + '\');"></div><span>' +
                                                        escape(answers[i].answer) + '</span></div></button></div>\n';
                                                } else {
                                                    // If we don't have an image, we simply put the text along with a box with the legend color
                                                    html += '<div class="col-xs-12 text-left"><button id="btn-q' + parent.question_order + '-a' + answers[i].sortorder +
                                                        '" type="button" class="col-xs-12 btn btn-lg survey-answer outlined-text" value="' + escape(answers[i].answer) +
                                                        '" onclick="emapic.modules.survey.addAnswer(\'q' + parent.question_order + '\', \'btn-q' + parent.question_order + '-a' +
                                                        answers[i].sortorder + '\', \'' + answers[i].sortorder + '\')"' + ((parent.legend_question == 'color' &&
                                                        answers[i].legend !== null) ? (' style="border-color: ' + escape(answers[i].legend) + '"') : '' ) +
                                                        '><div class="flex-container"><span>' + escape(answers[i].answer) + '</span></div></button></div>\n';
                                                }
                                                html += '<style>#btn-q' + parent.question_order + '-a' + answers[i].sortorder + ':hover,' +
                                                '#btn-q' + parent.question_order + '-a' + answers[i].sortorder + ':focus,' +
                                                '#btn-q' + parent.question_order + '-a' + answers[i].sortorder + '.active {' +
                                                ((parent.legend_question == 'color' && escape(answers[i].legend) !== null) ? ('background-color: ' +
                                                escape(answers[i].legend) + ';') : '' ) + '}</style>';
                                            }
                                        } else {
                                            html += '<div class="rowbtns row">\n';
                                            // If we have only two answers, we display them in as VS in a sole row
                                            for (var j = 0, jLen = answers.length; j < jLen; j++) {
                                                if (answers[j].img !== null && answers[j].img.length > 0) {
                                                    // If we have an image for the answer, we display it inside the button, with a tooltip with the text
                                                    html += '<div class="col-xs-12 col-lg-6 text-center"><button id="btn-q' + parent.question_order + '-a' + answers[j].sortorder +
                                                        '" type="button" class="survey-answer outlined-text btn btn-lg answer-with-image" value="' + escape(answers[j].answer) +
                                                        '" onclick="emapic.modules.survey.addAnswer(\'q' + parent.question_order + '\', \'btn-q' + parent.question_order + '-a' +
                                                        answers[j].sortorder + '\', \'' + answers[j].sortorder + '\')"' +
                                                        ((parent.legend_question == 'color' && answers[j].legend !== null) ? (' style="border-color: ' +
                                                        escape(answers[j].legend) + '"') : '' ) + ' title="' + escape(answers[j].answer) + '">' + '<div class="img-with-caption"><img src="/answer_img/' +
                                                        answers[j].id + '" alt="' + escape(answers[j].answer) + '" title="' + escape(answers[j].answer) + '"/><div class="img-caption">' + escape(answers[j].answer) + '</div></button></div>\n';
                                                } else {
                                                    // If we don't have an image, we simply put the text
                                                    html += '<div class="col-xs-12 col-lg-6 text-center"><button id="btn-q' + parent.question_order + '-a' + answers[j].sortorder +
                                                        '" type="button" class="survey-answer outlined-text btn btn-lg" value="' + escape(answers[j].answer) +
                                                        '" onclick="emapic.modules.survey.addAnswer(\'q' + parent.question_order + '\', \'btn-q' + parent.question_order +
                                                        '-a' + answers[j].sortorder + '\', \'' + answers[j].sortorder + '\')"' +
                                                        ((parent.legend_question == 'color' && escape(answers[j].legend) !== null) ? (' style="border-color: ' +
                                                        escape(answers[j].legend) + '"') : '' ) + '>' + escape(answers[j].answer) + '</button></div>\n';
                                                }
                                                html += '<style>#btn-q' + parent.question_order + '-a' + answers[j].sortorder + ':hover,' +
                                                '#btn-q' + parent.question_order + '-a' + answers[j].sortorder + ':focus,' +
                                                '#btn-q' + parent.question_order + '-a' + answers[j].sortorder + '.active {' +
                                                ((parent.legend_question == 'color' && escape(answers[j].legend) !== null) ? ('background-color: ' +
                                                escape(answers[j].legend) + ';') : '' ) + '}</style>';
                                            }
                                        }
                                        html += '</div>\n';
                                        break;
                                    case 'list-radio-other':
                                        html += '<div class="listbtns row">\n';
                                        var otherAnswer = null;
                                        for (var k = 0, kLen = answers.length; k < kLen; k++) {
                                            if (answers[k].sortorder == -1) {
                                                otherAnswer = answers[k];
                                                continue;
                                            }
                                            if (answers[k].img !== null && answers[k].img.length > 0) {
                                                // If we have an image for the answer, we display it inside a box with the legend color left of the answer's text
                                                html += '<div class="col-xs-12 text-left"><button id="btn-q' + parent.question_order + '-a' + answers[k].sortorder +
                                                    '" type="button" class="col-xs-12 btn btn-lg survey-answer outlined-text answer-with-image" value="' + escape(answers[k].answer) +
                                                    '" onclick="emapic.modules.survey.addAnswer(\'q' + parent.question_order + '\', \'btn-q' + parent.question_order + '-a' +
                                                    answers[k].sortorder + '\', \'' + answers[k].sortorder + '\')"' + ((parent.legend_question == 'color' && answers[k].legend !== null) ?
                                                    (' style="border-color: ' + escape(answers[k].legend) + '"') : '' ) + '><div class="flex-container">' +
                                                    '<div class="answer-img" style="background-image: url(\'/answer_img/' + answers[k].id +
                                                    '\');"></div><span>' + escape(answers[k].answer) + '</span></div></button></div>\n';
                                            } else {
                                                // If we don't have an image, we simply put the text along with a box with the legend color
                                                html += '<div class="col-xs-12 text-left"><button id="btn-q' + parent.question_order + '-a' + answers[k].sortorder +
                                                    '" type="button" class="col-xs-12 btn btn-lg survey-answer outlined-text" value="' + escape(answers[k].answer) +
                                                    '" onclick="emapic.modules.survey.addAnswer(\'q' + parent.question_order + '\', \'btn-q' + parent.question_order + '-a' +
                                                    answers[k].sortorder + '\', \'' + answers[k].sortorder + '\')"' + ((parent.legend_question == 'color' &&
                                                    answers[k].legend !== null) ? (' style="border-color: ' + escape(answers[k].legend) + '"') : '' ) +
                                                    '><div class="flex-container"><span>' + escape(answers[k].answer) + '</span></div></button></div>\n';
                                            }
                                            html += '<style>#btn-q' + parent.question_order + '-a' + answers[k].sortorder + ':hover,' +
                                            '#btn-q' + parent.question_order + '-a' + answers[k].sortorder + ':focus,' +
                                            '#btn-q' + parent.question_order + '-a' + answers[k].sortorder + '.active {' +
                                            ((parent.legend_question == 'color' && escape(answers[k].legend) !== null) ? ('background-color: ' +
                                            escape(answers[k].legend) + ';') : '' ) + '}</style>';
                                        }
                                        if (otherAnswer !== null) {
                                            if (otherAnswer.img !== null && otherAnswer.img.length > 0) {
                                                // If we have an image for the answer, we display it inside a box with the legend color left of the answer's text
                                                html += '<div class="col-xs-12 text-left"><div id="btn-q' + parent.question_order + '-other"' +
                                                    ' class="col-xs-12 btn btn-lg survey-answer outlined-text answer-with-image other-answer"' +
                                                    ((parent.legend_question == 'color' && otherAnswer.legend !== null) ? (' style="border-color: ' +
                                                    escape(otherAnswer.legend) + '"') : '' ) + '><div class="flex-container">' +
                                                    '<div class="answer-img" style="background-image: url(\'/answer_img/' + otherAnswer.id +
                                                    '\');"></div><input autocomplete="off" id="btn-q' + parent.question_order + '-other-input"' +
                                                    ' placeholder="' + escape(otherAnswer.answer) + '" type="text" target="btn-q' + parent.question_order +
                                                    '-other-ok" onkeydown="emapic.utils.inputEnterToClick(event)" onkeyup="emapic.utils.checkInputNotVoid(this)"/><button id="btn-q' + parent.question_order +
                                                    '-other-ok" autocomplete="off" disabled class="btn btn-primary pull-right" onclick="emapic.modules.survey.addAnswer(\'q' + parent.question_order +
                                                    '\', \'btn-q' + parent.question_order + '-other-input\', \'' + otherAnswer.sortorder + '\')">OK</button></div></div></div>\n';
                                            } else {
                                                // If we don't have an image, we simply put the text along with a box with the legend color
                                                html += '<div class="col-xs-12 text-left"><div id="btn-q' + parent.question_order + '-other"' +
                                                    ' class="col-xs-12 btn btn-lg survey-answer outlined-text other-answer"' + ((parent.legend_question == 'color' &&
                                                    otherAnswer.legend !== null) ? (' style="border-color: ' + escape(otherAnswer.legend) + '"') : '' ) +
                                                    '><div class="flex-container"><input autocomplete="off" id="btn-q' + parent.question_order +
                                                    '-other-input" placeholder="' + escape(otherAnswer.answer) + '" type="text" target="btn-q' + parent.question_order +
                                                    '-other-ok" onkeydown="emapic.utils.inputEnterToClick(event)" onkeyup="emapic.utils.checkInputNotVoid(this)"/><button id="btn-q' + parent.question_order +
                                                    '-other-ok" autocomplete="off" disabled class="btn btn-primary pull-right" onclick="emapic.modules.survey.addAnswer(\'q' + parent.question_order +
                                                    '\', \'btn-q' + parent.question_order + '-other-input\', \'' + otherAnswer.sortorder + '\')">OK</button></div></div></div>\n';
                                            }
                                            html += '<style>#btn-q' + parent.question_order + '-other:hover,' +
                                            '#btn-q' + parent.question_order + '-other:focus,' +
                                            '#btn-q' + parent.question_order + '-other:active,' +
                                            '#btn-q' + parent.question_order + '-other.active {' +
                                            ((parent.legend_question == 'color' && escape(otherAnswer.legend) !== null) ? ('background-color: ' +
                                            escape(otherAnswer.legend) + ';') : '' ) + '}</style>';
                                        }
                                        html += '</div>\n';
                                        break;
                                    default:
                                        return null;
                                }
                                return html + '</div>';
                            }
                        );
                    case 'text-answer':
                        return '<div class="main-question" id="question-' + parent.question_order + '">\n<h2>' + escape(parent.question) + '</h2>\n' +
                            '<div class="col-xs-12 text-left"><div id="q' + parent.question_order + '-other"' +
                            ' class="col-xs-12 btn btn-lg survey-answer text-answer"><div class="flex-container"><input autocomplete="off" id="q' +
                            parent.question_order + '-input" type="text" target="q' + parent.question_order +
                            '-ok" onkeydown="emapic.utils.inputEnterToClick(event)" onkeyup="emapic.utils.checkInputNotVoid(this)"/><button id="q' + parent.question_order +
                            '-ok" autocomplete="off" disabled class="btn btn-primary pull-right" onclick="emapic.modules.survey.addAnswer(\'q' + parent.question_order +
                            '\', \'q' + parent.question_order + '-input\')">OK</button></div></div></div>\n</div>';
                    case 'image-url':
                        return '<div class="main-question" id="question-' + parent.question_order + '">\n<h2>' + escape(parent.question) + '</h2>\n' +
                            '<div class="col-xs-12 text-left"><div id="q' + parent.question_order + '-other"' +
                            ' class="col-xs-12 btn btn-lg survey-answer text-answer"><div class="flex-container"><input autocomplete="off" id="q' +
                            parent.question_order + '-input" type="text" target="q' + parent.question_order +
                            '-ok" onkeydown="emapic.utils.inputEnterToClick(event)" onchange="emapic.utils.checkInputUrlIsImage(this)"' +
                            ' onkeyup="emapic.utils.checkInputUrlIsImage(this)"/><button id="q' + parent.question_order +
                            '-ok" autocomplete="off" disabled class="btn btn-primary pull-right" onclick="emapic.modules.survey.addAnswer(\'q' + parent.question_order +
                            '\', \'q' + parent.question_order + '-input\')">OK</button></div></div></div>\n</div>';
                    case 'explanatory-text':
                        return '<div class="main-question" id="question-' + parent.question_order + '">\n' +
                            '<div class="col-xs-12 text-center"><div id="q' + parent.question_order + '-other"' +
                            '  class="col-xs-12 col-md-6 col-md-offset-3 survey-answer explanatory-text"><p id="q' + parent.question_order +
                            '">' + linkifyHtml(escape(parent.question)) + '</p><br/><button id="q' + parent.question_order +
                            '-ok" class="btn btn-primary" onclick="emapic.modules.survey.advanceSurvey()">OK</button></div></div>\n</div>';
                    default:
                        return new Error("Question type not contemplated.");
                }
            },
        },
        tableName: 'questions',
        schema: 'metadata'
    });

    return Question;
};
