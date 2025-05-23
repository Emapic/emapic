var fs = require('fs'),
    path = require('path'),
    escape = require('escape-html'),
    Promise = require('bluebird'),
    linkifyHtml = require('linkifyjs/html'),
    sequelize = require('sequelize'),
    answerLayout = {
        'row': 1,
        'list': 2,
        'listOther': 3
    };
const Op = sequelize.Op;

function parseQuestionsfromPost(req, survey) {
    var questions = [];
    for (var i = 1;;i++) {
        if (!((('question_type_' + i) in req.body) && (('question_' + i) in req.body))) {
            break;
        }
        var questionType = req.body['question_type_' + i].trim(),
            textLimit = 150,
            legend = null,
            type = questionType,
            mandatory = true,
            order = i - 1;
        if (questionType === '') {
            continue;
        }
        switch (questionType) {
            case 'list-radio':
                if (req.body['question_' + i].trim() === '' ||
                    !(('option_' + i + '_1') in req.body) ||
                    !(('option_' + i + '_1_color') in req.body)) {
                    type = null;
                } else {
                    type = (('responses_' + i + '_other') in req.body) ? 'list-radio-other' : 'list-radio';
                    legend = 'color';
                }
                break;
            case 'text-answer':
            case 'long-text-answer':
            case 'image-upload':
            case 'image-url':
                if (req.body['question_' + i].trim() === '') {
                    type = null;
                } else {
                    if (req.body['optional_question_' + i] !== undefined) {
                        mandatory = false;
                    }
                }
                break;
            case 'explanatory-text':
                if (req.body['question_' + i].trim() === '') {
                    type = null;
                }
                textLimit = 1000;
                break;
            default:
                return new Error("Question type not contemplated.");
        }
        if (type !== null) {
            questions.push({
                survey_id : survey ? survey.id : null,
                type : type,
                question : (req.body['question_' + i] ? req.body['question_' + i].substring(0, textLimit).trim() : null),
                mandatory: mandatory,
                question_order : order,
                legend_question : legend
            });
        }
    }
    return questions;
}

function checkValidAnswersFromPost(req, questions) {
    var answers = [];
    for (var i = 1, iLen = questions.length; i<=iLen; i++) {
        var question = questions[i-1];
        switch(question.type) {
            case 'list-radio':
            case 'list-radio-other':
                for (var j = 1;; j++) {
                    // If there are no more numbered options, we look for option 'other'
                    if (!(('option_' + i + '_' + j) in req.body) || req.body['option_' + i + '_' + j].trim() === '') {
                        if (!(('option_' + i + '_other') in req.body) || req.body['option_' + i + '_other'].trim() === '') {
                            break;
                        }
                        j = 'other';
                    }
                    if (req.files['img_' + i + '_' + j] && req.files['img_' + i + '_' + j].size) {
                        if (!(Utils.isImage(fs.readFileSync(req.files['img_' + i + '_' + j].path)))) {
                            return Promise.reject({
                                message: "invalid image for question nr " + i + " answer nr " + j + ": selected file is not an image.",
                                code: 'answer_img_invalid'
                            });
                        }
                        if (req.files['img_' + i + '_' + j].size > 2000000) {
                            return Promise.reject({
                                message: "invalid image for question nr " + i + " answer nr " + j + ": image file exceeds the 2MB max size.",
                                code: 'answer_img_too_big'
                            });
                        }
                    }
                    // Other option is always the last iteration, and it's not a number, so we break before everything explodes!
                    if (j === 'other') {
                        break;
                    }
                }
                break;
            case 'text-answer':
            case 'long-text-answer':
            case 'explanatory-text':
            case 'image-upload':
            case 'image-url':
                // These question types have no special checks
                break;
            default:
                return new Error("Question type not contemplated.");
        }
    }
    return Promise.resolve();

}

function parseAnswersFromPost(req, questions, oldAnswers) {
    var answers = [];
    oldAnswers = oldAnswers || null;
    for (var i = 1, iLen = questions.length; i<=iLen; i++) {
        var question = questions[i-1];
        switch(question.type) {
            case 'list-radio':
            case 'list-radio-other':
                for (var j = 1;; j++) {
                    // If there are no more numbered options, we look for option 'other'
                    if (!(('option_' + i + '_' + j) in req.body) || req.body['option_' + i + '_' + j].trim() === '') {
                        if (!(('option_' + i + '_other') in req.body) || req.body['option_' + i + '_other'].trim() === '') {
                            break;
                        }
                        j = 'other';
                    }
                    // If a file was uploaded, we use it
                    var answerImg = (req.files['img_' + i + '_' + j] && req.files['img_' + i + '_' + j].size) ?
                        fs.readFileSync(req.files['img_' + i + '_' + j].path) : null;
                    if (req.files['img_' + i + '_' + j]) {
                        if (answerImg === null && oldAnswers !== null) {
                            // If not and we have old answers, we recycle the image previously used for this answer
                            if (!isNaN(req.body['id_' + i + '_' + j])) {
                                var originalId = parseInt(req.body['id_' + i + '_' + j], 10);
                                images:
                                for (var k = 0, kLen = oldAnswers.length; k<kLen; k++) {
                                    for (var l = 0, lLen = oldAnswers[k].length; l<lLen; l++) {
                                        if (oldAnswers[k][l].id === originalId) {
                                            answerImg = oldAnswers[k][l].img;
                                            break images;
                                        }
                                    }
                                }
                            }
                        }
                    }
                    answers.push({
                        question_id : question.id,
                        answer : (req.body['option_' + i + '_' + j] ? req.body['option_' + i + '_' + j].substring(0, 150).trim() : null),
                        sortorder : (j === 'other')? -1 : j - 1,
                        legend : req.body['option_' + i + '_' + j + '_color'],
                        img : answerImg
                    });
                    // Other option is always the last iteration, and it's not a number, so we break before everything explodes!
                    if (j === 'other') {
                        break;
                    }
                }
                break;
            case 'text-answer':
            case 'long-text-answer':
            case 'explanatory-text':
            case 'image-upload':
            case 'image-url':
                // These question types have no predefined answers
                break;
            default:
                return new Error("Question type not contemplated.");
        }
    }
    return answers;
}

function getAnswerStyle(answer, layout, question) {
    var answerId = (layout === answerLayout.listOther) ? 'other' : 'a' + answer.sortorder;
    return '<style>#btn-q' + question.question_order + '-' + answerId + ':hover,' +
        '#btn-q' + question.question_order + '-' + answerId + ':focus,' +
        '#btn-q' + question.question_order + '-' + answerId + '.active {' +
        ((question.legend_question === 'color' && escape(answer.legend) !== null) ? ('background-color: ' +
        escape(answer.legend) + ';') : '' ) + '}</style>';
}

function generateExclusiveBtnAnswerHtml(answer, layout, question) {
    var btnClass,
        divClass,
        btnContent,
        style = '';
    switch (layout) {
        case answerLayout.row:
            if (answer.img !== null && answer.img.length > 0) {
                // If we have an image for the answer, we display it inside the button, with a tooltip with the text
                btnClass = ' answer-with-image';
                btnContent = '<div class="img-with-caption"><img src="/answer_img/' +
                    answer.id + '" alt="' + escape(answer.answer) + '" title="' + escape(answer.answer) +
                    '"/><div class="img-caption">' + escape(answer.answer) + '</div>';
            } else {
                // If we don't have an image, we simply put the text
                btnClass = '';
                btnContent = escape(answer.answer);
            }
            divClass = ' col-lg-6 text-center';
            break;
        case answerLayout.list:
            if (answer.img !== null && answer.img.length > 0) {
                // If we have an image for the answer, we display it inside a box with the legend color left of the answer's text
                btnClass = ' answer-with-image col-xs-12';
                btnContent = '<div class="flex-container"><div class="answer-img" style="background-image: url(\'/answer_img/' + answer.id +
                    '\');"></div><span>' + escape(answer.answer) + '</span></div>';
            } else {
                // If we don't have an image, we simply put the text along with a box with the legend color
                btnClass = ' col-xs-12';
                btnContent = '<div class="flex-container"><span>' + escape(answer.answer) + '</span></div>';
            }
            divClass = ' text-left';
            break;
        case answerLayout.listOther:
            divClass = ' text-left';
            btnClass = '';
            btnContent = '<input autocomplete="off" id="btn-q' + question.question_order +
                '-other-input" placeholder="' + escape(answer.answer) + '" type="text" target="#btn-q' + question.question_order +
                '-other-ok, #end-survey-btn, #block-nav-btns .edit-question-btn.btn-success ~ .edit-question-btn:not([disabled])" target-ok="#btn-q' + question.question_order +
                '-other-ok" onkeydown="emapic.utils.inputEnterToClick(event)" onkeyup="emapic.utils.checkInputNotVoid(this, true)"/><button id="btn-q' + question.question_order +
                '-other-ok" autocomplete="off" disabled class="btn btn-primary pull-right" onclick="emapic.modules.survey.addAnswer(\'q' + question.question_order +
                '\', \'btn-q' + question.question_order + '-other-input\', \'' + answer.sortorder + '\')">OK</button>';
            if (answer.img !== null && answer.img.length > 0) {
                btnClass = ' answer-with-image';
                btnContent = '<div class="answer-img" style="background-image: url(\'/answer_img/' + answer.id +
                '\');"></div>' + btnContent;
            }
            break;
        default:
            throw Error('Invalid question answer layout: ' + layout);
    }
    var html = '<div class="col-xs-12' + divClass + '">',
        btnStyle = ((question.legend_question === 'color' && answer.legend !== null) ? (' style="border-color: ' + escape(answer.legend) + '"') : '' );
    switch (layout) {
        case answerLayout.row:
        case answerLayout.list:
            html += '<button id="btn-q' + question.question_order + '-a' + answer.sortorder +
                '" type="button" class="survey-answer outlined-text btn btn-lg' + btnClass + '" value="' + escape(answer.answer) +
                '" onclick="emapic.modules.survey.addAnswer(\'q' + question.question_order + '\', \'btn-q' + question.question_order + '-a' +
                answer.sortorder + '\', \'' + answer.sortorder + '\')"' + btnStyle +
                '>' + btnContent + '</button>';
            break;
        case answerLayout.listOther:
            html += '<div id="btn-q' + question.question_order + '-other"' +
                ' class="col-xs-12 btn btn-lg survey-answer outlined-text other-answer"' + btnClass +
                btnStyle + '><div class="flex-container">' + btnContent + '</div></div>';
            break;
        default:
            throw Error('Invalid question answer layout: ' + layout);
    }
    html += '</div>\n' + getAnswerStyle(answer, layout, question);
    return html;
}

function generateTextInputQuestionHtml(question, validator, maxLength, placeholderText, req) {
    var opt = req.i18n.__('optional_note'),
        max = req.i18n.__('max_length_note'),
        validator = validator || null,
        mandatory = question.mandatory;

    return '<h2>' + escape(question.question) + (mandatory ? '' : '<small><i> (' + opt + ') </i></small>') + '</h2>\n' +
        '<div class="col-xs-12 text-left"><div id="q' + question.question_order + '-other"' +
        ' class="col-xs-12 survey-answer text-answer"><div class="flex-container"><input autocomplete="off" id="q' +
        question.question_order + '-input" type="text" ' + (placeholderText !== null ? 'placeholder-i18ntext="' + placeholderText + '" ' : '') +
        (maxLength ? 'maxlength="' + maxLength + '" ' : '') + 'target="#q' + question.question_order +
        '-ok, #end-survey-btn, #block-nav-btns .edit-question-btn.btn-success ~ .edit-question-btn:not([disabled])" target-ok="#q' +
        question.question_order + '-ok" onkeydown="emapic.utils.inputEnterToClick(event)" ' + (validator !== null ?
        ' onkeyup="' + validator + '(this, ' + mandatory + ')" onchange="' + validator + '(this, ' + mandatory + ')"' : '') + '/><button id="q' + question.question_order +
        '-ok"'  + (mandatory ? ' disabled' : '') + ' autocomplete="off" class="btn btn-primary pull-right" onclick="emapic.modules.survey.addAnswer(\'q' + question.question_order +
        '\', \'q' + question.question_order + '-input\')">OK</button></div>' + (maxLength ? '<label class="footer">' + max.replace('{{length}}', maxLength) + '</label>' : '') + '</div></div>';
}

function generateTextAreaQuestionHtml(question, validator, maxLength, placeholderText, req) {
    var opt = req.i18n.__('optional_note'),
        max = req.i18n.__('max_length_note'),
        validator = validator || null,
        mandatory = question.mandatory;

    return '<h2>' + escape(question.question) + (mandatory ? '' : '<small><i> (' + opt + ') </i></small>') + '</h2>\n' +
        '<div class="col-xs-12 text-left"><div id="q' + question.question_order + '-other"' +
        ' class="col-xs-12 survey-answer text-answer"><div class="flex-container"><textarea autocomplete="off" id="q' +
        question.question_order + '-input" type="text" ' + (placeholderText !== null ? 'placeholder-i18ntext="' + placeholderText + '" ' : '') +
        (maxLength ? 'maxlength="' + maxLength + '" ' : '') + 'target="#q' + question.question_order +
        '-ok, #end-survey-btn, #block-nav-btns .edit-question-btn.btn-success ~ .edit-question-btn:not([disabled])" target-ok="#q' +
        question.question_order + '-ok" ' + (validator !== null ?
        ' onkeyup="' + validator + '(this, ' + mandatory + ')" onchange="' + validator + '(this, ' + mandatory + ')"' : '') + '></textarea><button id="q' + question.question_order +
        '-ok"'  + (mandatory ? ' disabled' : '') + ' autocomplete="off" class="btn btn-primary pull-right" onclick="emapic.modules.survey.addAnswer(\'q' + question.question_order +
        '\', \'q' + question.question_order + '-input\')">OK</button></div>' + (maxLength ? '<label class="footer">' + max.replace('{{length}}', maxLength) + '</label>' : '') + '</div></div>';
}

function generateImageInputQuestionHtml(question, validator, req) {
    var fileSizeText = req.i18n.__('maximum_image_upload_size'),
        opt = req.i18n.__('optional_note'),
        validator = validator || null,
        mandatory = question.mandatory;

    return '<h2>' + escape(question.question) + (mandatory ? '' : '<small><i> (' + opt + ') </i></small>') + '</h2>\n' +
        '<div class="col-xs-12"><div id="q' + question.question_order + '-other"' +
        ' class="col-xs-12 survey-answer upload-file-answer">' +
        '<div><img class="img-responsive img-thumbnail" id="inputfileimg_' + question.question_order +
        '-noimage" src=\'data:image/svg+xml;utf8,' + encodeURIComponent(Utils.getLocalizedSelectAnImageSVG(req)) + '\'' +
        ' onclick="$(\'input[name=\\\'img_upload_'  + question.question_order + '\\\']\').click()">' +
        '<img class="img-responsive img-thumbnail" id="inputfileimg_' + question.question_order + '" src=\'\' style="display:none;"' +
        ' onclick="$(\'input[name=\\\'img_upload_'  + question.question_order + '\\\']\').click()"></div>' +
        '<div class="flex-container"><div><div class="input-with-clear-btn"><input autocomplete="off"' +
        (mandatory ? ' required' : '') + ' type="file" accept="image/*" name="img_upload_'  + question.question_order +
        '"' + ' id="q' + question.question_order + '-input" target="#q' + question.question_order +
        '-ok, #end-survey-btn, #block-nav-btns .edit-question-btn.btn-success ~ .edit-question-btn:not([disabled])" target-ok="#q' +
        question.question_order + '-ok" target-help="help-block_'+ question.question_order + '" data-maxfilesize="10000000"' +
        (validator !== null ? ' onchange="emapic.utils.checkClearInput(this);emapic.utils.loadInputImage(this,\'inputfileimg_' +
        question.question_order + '\'); ' + validator + '(this, ' + mandatory + ')"' : '') +
        ' /><a class="clear-input disabled" onclick="emapic.utils.clearInput(\'img_upload_'  + question.question_order + '\')">' +
        '<i class="fas fa-times-circle"></i></a></div><div id="help-block_'+ question.question_order +'" class="help-block">' +
        fileSizeText + '</div></div>' + '<button id="q' + question.question_order + '-ok" autocomplete="off" ' +
        (mandatory ? ' disabled="true"' : '') + ' class="btn btn-primary pull-right" onclick="emapic.modules.survey.addAnswer(\'q' +
        question.question_order + '\', \'q' + question.question_order + '-input\')">OK</button></div></div></div>';
}

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
            defaultOrdering: function() {
                return {
                    order: Utils.createOrderArray(Question.getDefaultOrder())
                };
            },
            withLegend: {
                where: {
                    legend_question: {
                        [Op.ne]: null
                    }
                }
            }
        },
        tableName: 'questions',
        schema: 'metadata'
    });

    Question.maxLengths = {
        'text-answer': 150,
        'long-text-answer': 500
    };

    // Class methods
    Question.getDefaultOrder = function() {
        return ['question_order'];
    };

    Question.associate = function(models) {
        // Scope must be added here because models.Answer must be already defined
        Question.addScope('includeAnswers', {
            include: [models.Answer],
            order: Utils.createOrderArray(Question.getDefaultOrder()).concat(Utils.createOrderArray(models.Answer.getDefaultOrder(), models.Answer))
        });
        Question.addScope('includeSurvey', {
            include: [models.Survey]
        });
        Question.belongsTo(models.Survey, {foreignKey: 'survey_id'});
        models.Survey.hasMany(Question.scope('defaultOrdering'), {foreignKey: 'survey_id'});
    };

    Question.checkValidPost = function(req) {
        var questions = parseQuestionsfromPost(req);
        if (questions.length === 0) {
            return Promise.reject({
                message: "survey without any questions defined.",
                code: 'empty_survey'
            });
        }
        return checkValidAnswersFromPost(req, questions);
    };

    Question.createFromPost = function(req, survey) {
        return Question.bulkCreate(parseQuestionsfromPost(req, survey), {individualHooks: true}).then(function(questions) {
            return models.Answer.bulkCreate(parseAnswersFromPost(req, questions), {individualHooks: true}).return(questions);
        });
    };

    Question.updateFromPost = function(req, survey) {
        var oldQuestions, oldAnswers = [];
        // We retrieve previous survey questions
        return survey.getQuestions({
            scope: 'includeAnswers'
        }).then(function(questions) {
            oldQuestions = questions;
            for (var j = 0, jLen = oldQuestions.length; j<jLen; j++) {
                oldAnswers.push(oldQuestions[j].Answers);
            }
            return Promise.map(oldQuestions, function(question) {
                // We destroy previous survey questions + answers
                return question.destroy();
            });
        }).then(function() {
            return Question.bulkCreate(parseQuestionsfromPost(req, survey), {individualHooks: true});
        }).then(function(questions) {
            return models.Answer.bulkCreate(parseAnswersFromPost(req, questions, oldAnswers), {individualHooks: true}).return(questions);
        });
    };

    Question.getFieldsToHideInDescription = function() {
        return ['title', 'language', 'Answers'];
    };

    // Instance Methods
    Question.prototype.checkGetAnswers = function() {
        return (typeof this.Answers !== 'undefined') ? Promise.resolve(this.Answers) : this.getAnswers();
    };

    Question.prototype.getDdlSql = function() {
        switch (this.type) {
            case 'list-radio-other':
                return "q" + this.question_order + " text" + (this.mandatory ? " NOT NULL" : "") + ", q" + this.question_order + "_other text";
            case 'list-radio':
            case 'text-answer':
            case 'long-text-answer':
            case 'image-url':
                return "q" + this.question_order + " text" + (this.mandatory ? " NOT NULL" : "");
            case 'image-upload':
                return "q" + this.question_order + " int REFERENCES metadata.files ON UPDATE CASCADE ON DELETE SET NULL";
            case 'explanatory-text':
                return "";
            default:
                return new Error("Question type not contemplated.");
        }
    };

    Question.prototype.getSelectSql = function() {
        switch (this.type) {
            case 'list-radio-other':
                return 'a.q' + this.question_order + ' AS "q' + this.question_order + '.id", a.q' + this.question_order + '_other AS "q' + this.question_order + '.value"';
            case 'list-radio':
                return 'a.q' + this.question_order + ' AS "q' + this.question_order + '.id"';
            case 'text-answer':
            case 'long-text-answer':
            case 'image-url':
                return 'a.q' + this.question_order + ' AS "q' + this.question_order + '.value"';
            case 'image-upload':
                if (!this.mandatory) {
                    return 'CASE WHEN a.q' + this.question_order + ' IS NULL THEN NULL ELSE \'/api/survey/' + Utils.encryptSurveyId(this.Survey.id) + '/result/\' || a.gid || \'/image/' + this.question_order + '\' END AS "q' + this.question_order + '.value"';
                } else {
                    return '\'/api/survey/' + Utils.encryptSurveyId(this.Survey.id) + '/result/\' || a.gid || \'/image/' + this.question_order + '\' AS "q' + this.question_order + '.value"';
                }
            case 'explanatory-text':
                return '';
            default:
                return new Error("Question type not contemplated.");
        }
    };

    Question.prototype.checkValidResponse = function(responses) {
        var question = this,
            promise = (typeof this.Answers !== 'undefined') ? Promise.resolve(this.Answers) : this.getAnswers();
        return promise.then(function(answers) {
            var answer = null;
            switch (question.type) {
                case 'list-radio-other':
                    if (responses['q' + question.question_order + '.id']) {
                        answer = parseInt(responses['q' + question.question_order + '.id'], 10);
                        if (answer === -1) {
                            if (responses['q' + question.question_order + '.value']) {
                                responses['q' + question.question_order + '.value'] = responses['q' + question.question_order + '.value'].trim();
                            }
                            if (!responses['q' + question.question_order + '.value']) {
                                answer = answer + ' [null]';
                                break;
                            }
                            return Promise.resolve();
                        }
                    }
                    /* falls through */
                case 'list-radio':
                    if (responses['q' + question.question_order + '.id']) {
                        answer = parseInt(responses['q' + question.question_order + '.id'], 10);
                        for (var i = 0, len = answers.length; i<len; i++) {
                            if (answers[i].sortorder === answer) {
                                return Promise.resolve();
                            }
                        }
                    }
                    break;
                case 'text-answer':
                case 'long-text-answer':
                    answer = responses['q' + question.question_order + '.value'];
                    if (!question.mandatory || responses['q' + question.question_order + '.value']) {
                        if (responses['q' + question.question_order + '.value']) {
                            responses['q' + question.question_order + '.value'] = responses['q' + question.question_order + '.value'].trim();
                        }
                        if (!responses['q' + question.question_order + '.value']) {
                            if (question.mandatory) {
                                break;
                            } else {
                                responses['q' + question.question_order + '.value'] = null;
                            }
                        }
                        return Promise.resolve();
                    }
                    break;
                case 'explanatory-text':
                    return Promise.resolve();
                case 'image-upload':
                    if (!question.mandatory && responses['q' + question.question_order + '.value'] === "") {
                        return Promise.resolve();
                    } else {
                        if (('q' + question.question_order + '.value') in responses &&
                          'path' in responses['q' + question.question_order + '.value']) {
                            answer = responses['q' + question.question_order + '.value'];
                            if (!(Utils.isImage(fs.readFileSync(responses['q' + question.question_order + '.value'].path)))) {
                                return Promise.reject({
                                    message: "invalid answer for question nr " + question.question_order + " : selected file is not an image.",
                                    status: 400,
                                    code: 'invalid_request'
                                });
                            }
                            if (responses['q' + question.question_order + '.value'].size > 10000000) {
                                return Promise.reject({
                                    message: "invalid answer for question nr " + question.question_order + " : image file exceeds the 10MB max size.",
                                    status: 400,
                                    code: 'invalid_request'
                                });
                            }
                            return Promise.resolve();
                        }
                    }
                    break;
                case 'image-url':
                    answer = responses['q' + question.question_order + '.value'];
                    if (answer) {
                        responses['q' + question.question_order + '.value'] = responses['q' + question.question_order + '.value'].trim();
                        if (answer.lastIndexOf('http', 0) !== 0) {
                            responses['q' + question.question_order + '.value'] = answer = 'http://' + answer;
                        }
                        return Utils.checkUrlIsImage(responses['q' + question.question_order + '.value']);
                    } else if (!question.mandatory) {
                        responses['q' + question.question_order + '.value'] = null;
                        // Image is empty because it is not mandatory
                        return Promise.resolve();
                    }
                    break;
                default:
                    return Promise.reject({
                        message: "question type not contemplated.",
                        status: 500,
                        code: 'internal_error'
                    });
            }
            return Promise.reject({
                message: "invalid answer for question nr " + question.question_order + " : " + answer,
                status: 400,
                code: 'invalid_request'
            });
        });
    };

    Question.prototype.getInsertSql = function(responses) {
        var respField = 'q' + this.question_order + '.id';
        switch (this.type) {
            case 'list-radio-other':
                if (respField in responses &&
                    parseInt(responses[respField], 10) === -1 &&
                    'q' + this.question_order + '.value' in responses) {
                        return ['q' + this.question_order + ', q' + this.question_order + '_other', '?, ?', [responses[respField], responses['q' + this.question_order + '.value']]];
                }
                break;
            case 'list-radio':
                break;
            case 'text-answer':
            case 'long-text-answer':
                var response = responses['q' + this.question_order + '.value'];
                return ['q' + this.question_order, '?', [response ? response.trim().substring(0, Question.maxLengths[this.type]) : null]];
                break;
            case 'image-url':
                respField = 'q' + this.question_order + '.value';
                break;
            case 'image-upload':
                // File is actually stored in a post-insert operation
                return ['q' + this.question_order, '?', [null]];
            case 'explanatory-text':
                return ['', '', []];
            default:
                return new Error("Question type not contemplated.");
        }
        if (respField in responses) {
            return ['q' + this.question_order, '?', [responses[respField]]];
        }
        return new Error("Question fields have not been sent: q" + this.question_order);
    };

    Question.prototype.getPostInsertOperations = function(responses, answerId) {
        var respField = 'q' + this.question_order + '.id',
            question = this,
            survey = this.Survey;
        switch (this.type) {
            case 'image-upload':
                // Store the image in the local filesystem, save its
                // metadata inside database and set a reference to it
                // in the saved answer.
                respField = 'q' + question.question_order + '.value';
                if (respField in responses && responses[respField] !== '') {
                    if ('path' in responses[respField]) {
                        return FileHelper.saveFileFromPath(responses[respField].path, 'images/survey/' + survey.id + '/answer/' + answerId +
                        '/answer_q' + question.question_order + path.extname(responses[respField].name), responses[respField].name).then(function(fileId) {
                            return sequelize.query('UPDATE opinions.survey_' + survey.id + ' SET q' + question.question_order + ' = ? WHERE gid = ?;',
                                { replacements: [fileId, answerId], type: sequelize.QueryTypes.UPDATE }
                            );
                        });
                    }
                }
                // Fall-through
            case 'list-radio-other':
            case 'list-radio':
            case 'text-answer':
            case 'long-text-answer':
            case 'image-url':
            case 'explanatory-text':
                // Nothing to do
                return Promise.resolve();
            default:
                return new Error("Question type not contemplated.");
        }
    };

    Question.prototype.clone = function(surveyId) {
        var props = Utils.extractProperties(this, ['id', 'survey_id']);
        props.survey_id = surveyId;
        return this.checkGetAnswers().then(function(answers){
            return Question.create(props).then(function(question) {
                return Promise.map(answers, function(answer) {
                    return answer.clone(question.id);
                });
            });
        });
    };

    Question.prototype.getHtml = function(req) {
        var parent = this,
            html = '';
        switch (parent.type) {
            case 'list-radio':
            case 'list-radio-other':
                return this.checkGetAnswers().then(
                    function(answers){
                        var html = '<div class="main-question" id="question-' + parent.question_order + '">\n';
                        switch (parent.type) {
                            case 'list-radio':
                            case 'list-radio-other':
                                var otherAnswer = null;
                                html += '<h2>' + escape(parent.question) + '</h2>\n';
                                if (answers.length > 2) {
                                    html += '<div class="listbtns row">\n';
                                    // If we have more than two answers, we display them in a vertical list
                                    for (var i = 0, iLen = answers.length; i < iLen; i++) {
                                        if (answers[i].sortorder === -1) {
                                            otherAnswer = answers[i];
                                            continue;
                                        }
                                        html += generateExclusiveBtnAnswerHtml(answers[i], answerLayout.list, parent);
                                    }
                                } else {
                                    html += '<div class="rowbtns row">\n';
                                    // If we have only two answers, we display them in as VS in a sole row
                                    for (var j = 0, jLen = answers.length; j < jLen; j++) {
                                        html += generateExclusiveBtnAnswerHtml(answers[j], answerLayout.row, parent);
                                    }
                                }
                                if (otherAnswer !== null) {
                                    html += generateExclusiveBtnAnswerHtml(otherAnswer, answerLayout.listOther, parent);
                                }
                                html += '</div>\n';
                                break;
                            default:
                                return new Error("Question type not contemplated.");
                        }
                        return html + '</div>';
                    }
                );
            case 'text-answer':
                html += generateTextInputQuestionHtml(parent, 'emapic.utils.checkInputNotVoid', Question.maxLengths[parent.type], 'type_answer', req);
                break;
            case 'long-text-answer':
                html += generateTextAreaQuestionHtml(parent, 'emapic.utils.checkInputNotVoid', Question.maxLengths[parent.type], 'type_answer', req);
                break;
            case 'image-upload':
                html += generateImageInputQuestionHtml(parent, 'emapic.utils.checkImageNotVoid', req);
                break;
            case 'image-url':
                html += generateTextInputQuestionHtml(parent, 'emapic.utils.checkInputUrlIsImage', null, 'type_image_url', req);
                break;
            case 'explanatory-text':
                html += '<div class="col-xs-12 text-center"><div id="q' + parent.question_order + '-other"' +
                    '  class="col-xs-12 col-md-6 col-md-offset-3 survey-answer explanatory-text"><p id="q' + parent.question_order +
                    '">' + Utils.transformNewlinesToHtml(linkifyHtml(escape(parent.question))) + '</p><br/><button id="q' + parent.question_order +
                    '-ok" class="btn btn-primary" onclick="emapic.modules.survey.advanceSurvey()">OK</button></div></div>';
                break;
            default:
                return new Error("Question type not contemplated.");
        }
        return '<div class="main-question" id="question-' + parent.question_order + '">\n' + html + '\n</div>';
    };

    Question.prototype.getFullDescription = function() {
        var description = this.getDescription(),
            answersPromise = typeof this.Answers !== 'undefined' ?
                Promise.resolve(this.Answers) : this.getAnswers();
        return answersPromise.then(function(answers) {
            return Promise.map(answers, function(answer) {
                return answer.getFullDescription();
            });
        }).then(function(answersDesc) {
            for (var i = 0, iLen = answersDesc.length; i<iLen; i++) {
                delete answersDesc[i].question_id;
            }
            description.answers = answersDesc;
            return description;
        });
    };

    return Question;
};
