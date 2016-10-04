var Promise = require('bluebird'),
    csv = Promise.promisifyAll(require('fast-csv'));

module.exports = function(app) {

    /*
    *   A function that converts a PostGIS query into a GeoJSON object.
    *   Copyright (C) 2012  Samuel Giles <sam@sam-giles.co.uk>
    *
    *   This program is free software: you can redistribute it and/or modify
    *   it under the terms of the GNU General Public License as published by
    *   the Free Software Foundation, either version 3 of the License, or
    *   (at your option) any later version.
    *
    *   This program is distributed in the hope that it will be useful,
    *   but WITHOUT ANY WARRANTY; without even the implied warranty of
    *   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    *   GNU General Public License for more details.

    *  You should have received a copy of the GNU General Public License
    *  along with this program.  If not, see <http://www.gnu.org/licenses/>.
    * https://gist.github.com/samgiles/2299524
    *
    */

    /**
     * Takes an array of associative objects/arrays and outputs a FeatureCollection object.  See <http://www.geojson.org/geojson-spec.html> example 1.1/
     * The Query that fetched the data would need to be similar to:
     *              SELECT {field_list}, st_asgeojson(...) AS geojson FROM geotable
     * Where the "AS geojson" must be as is. Because the function relies on a "geojson" column.
     *
     * @param queryResult The query result from the PostGIS database.  Format deduced from <https://gist.github.com/2146017>
     * @returns The equivalent GeoJSON object representation.
     */
    postGISQueryToFeatureCollection = function(queryResult) {
        // Initalise variables.
        var prop = null, geojson = {
            "type" : "FeatureCollection",
            "features" : []
        };
        // Set up the initial GeoJSON object.

        for (var i = 0, iLen = queryResult.length; i < iLen; i++) {// For each result create a feature
            var feature = {
                "type" : "Feature",
                "geometry" : JSON.parse(queryResult[i].geojson),
                "properties" : {}
            };
            // finally for each property/extra field, add it to the feature as properties as defined in the GeoJSON spec.
            for (prop in queryResult[i]) {
                if (prop !== "geojson" && queryResult[i].hasOwnProperty(prop)) {
                    feature.properties[prop] = queryResult[i][prop];
                }
            }
            // Push the feature into the features array in the geojson object.
            geojson.features.push(feature);
        }
        // return the FeatureCollection geojson object.
        return geojson;
    };

    addIndivVotePopupMessage = function(results, questions, answers) {
        var msg;
        for (var i = 0, iLen = results.length; i<iLen; i++) {
            msg = "";
            for (var j = 0, jLen = questions.length; j<jLen; j++) {
                switch (questions[j].type) {
                    case 'list-radio':
                    case 'list-radio-other':
                        var value;
                        var answer = null;
                        for (var k = 0, kLen = answers[questions[j].question_order].length; k<kLen; k++) {
                            if (answers[questions[j].question_order][k].sortorder == results[i]['q' + questions[j].question_order + '.id']) {
                                answer = answers[questions[j].question_order][k];
                                break;
                            }
                        }
                        if (answer !== null) {
                            if ((results[i]['q' + questions[j].question_order + '.id'] == -1) && (('q' + questions[j].question_order + '.value') in results[i])) {
                                value = answer.answer + ' (' + results[i]['q' + questions[j].question_order + '.value'] + ')';
                            } else {
                                value = answer.answer;
                            }
                        } else {
                            value = results[i]['q' + questions[j].question_order + '.id'];
                        }
                        msg += "<b>" + questions[j].question + ':</b> ' + value + '<br/>';
                        break;
                    case 'text-answer':
                        msg += "<b>" + questions[j].question + ':</b> ' + results[i]['q' + questions[j].question_order + '.value'] + '<br/>';
                        break;
                    case 'explanatory-text':
                        break;
                    default:
                        return new Error("Question type not contemplated.");
                }
            }
            results[i].popup_msg = msg;
        }
        return results;
    };

    addAggregatedVotesPopupMessage = function(results, questions, answers) {
        var msg;
        for (var i = 0, iLen = results.length; i<iLen; i++) {
            var popup = '<h3><small>' + results[i].name + '</small></h3>',
                popupProperties = '',
                orderedVotes = {},
                question;
            // We order the votes in descending order
            for (var j in results[i]) {
                if (j != 'name' && j != 'total_responses' && j != 'iso_code' &&
                    j != 'country_id' && j != 'adm_code' && j != 'adm_type' &&
                    j != 'country_iso_code' &&  j != 'geojson') {
                    question = j.split('_')[0];
                    if (isNaN(question.replace('q', '')) ||
                        isNaN(j.split('_')[1])) {
                        continue;
                    }
                    if (!orderedVotes[question]) {
                        orderedVotes[question] = [];
                    }
                    var position = orderedVotes[question].length;
                    for (var k in orderedVotes[question]) {
                        if (orderedVotes[question][k].nr < parseInt(results[i][j])) {
                            position = k;
                            break;
                        }
                    }
                    orderedVotes[question].splice(position, 0, {nr: parseInt(results[i][j]), name: j});
                }
            }
            for (var l in orderedVotes) {
                question = null;
                for (var q = 0, qLen = questions.length; q<qLen; q++) {
                    if ('q' + questions[q].question_order == l) {
                        question = questions[q];
                        break;
                    }
                }
                if (question !== null) {
                    popupProperties += '<b><small>' + question.question + '</small></b><br/>';
                }
                for (var m = 0, mLen = orderedVotes[l].length; m<mLen; m++) {
                    var name;
                    if (question !== null) {
                        var answer = null;
                        for (var n = 0, nLen = answers[question.question_order].length; n<nLen; n++) {
                            if (answers[question.question_order][n].sortorder == orderedVotes[l][m].name.split('_')[1]) {
                                answer = answers[question.question_order][n];
                                break;
                            }
                        }
                        if (answer !== null) {
                            name = answer.answer;
                        } else {
                            name = orderedVotes[l][m].name;
                        }
                    } else {
                        name = orderedVotes[l][m].name;
                    }
                    popupProperties += '<small>' + name + ':</small> ' + orderedVotes[l][m].nr + '<br/>';
                }
                if (popupProperties !== '') {
                    popupProperties = popupProperties.replace(new RegExp('<br/>$'), '<hr>');
                }
            }
            results[i].popup_msg = popup + popupProperties + '<small>Votos totales:</small> ' + results[i].total_responses;
        }
        return results;
    };

    pgQueryFullResultsToCsv = function(results, questions) {
        var headers = ['Date/Time', 'Lat', 'Lon', 'Country', 'Country ISO code', 'Province'];
        for (var i = 0, iLen = questions.length; i < iLen; i++) {
            switch (questions[i].type) {
                case 'list-radio':
                    headers.push(questions[i].question);
                    break;
                case 'list-radio-other':
                    var otherAns = null;
                    for (var j = 0, jLen = questions[i].Answers.length; j < jLen; j++) {
                        if (questions[i].Answers[j].sortorder == -1) {
                            otherAns = questions[i].Answers[j];
                            break;
                        }
                    }
                    var otherName = (otherAns === null) ? 'other value' : otherAns.answer;
                    headers.push(questions[i].question, questions[i].question + ' - ' + otherName);
                    break;
                case 'text-answer':
                    headers.push(questions[i].question);
                    break;
                case 'explanatory-text':
                    break;
                default:
                    return new Error("Question type not contemplated.");
            }
        }
        return csv.writeToStringAsync(
            results,
            {
                headers: headers,
                delimiter: ';',
                transform: function(result) {
                    var data = [];
                    data.push(new Date(parseInt(result.timestamp)).toISOString(),
                        result.lat, result.lon, result.country, result.country_iso,
                        result.province);
                    for (var l = 0, lLen = questions.length; l < lLen; l++) {
                        var ansId, ans;
                        switch (questions[l].type) {
                            case 'list-radio':
                                ans = ansId = result['q' + questions[l].question_order + '.id'];
                                for (var m = 0, mLen = questions[l].Answers.length; m < mLen; m++) {
                                    if (ansId == questions[l].Answers[m].sortorder) {
                                        ans = questions[l].Answers[m].answer;
                                    }
                                }
                                data.push(ans);
                                break;
                            case 'list-radio-other':
                                ans = ansId = result['q' + questions[l].question_order + '.id'];
                                for (var n = 0, nLen = questions[l].Answers.length; n < nLen; n++) {
                                    if (ansId == questions[l].Answers[n].sortorder) {
                                        ans = questions[l].Answers[n].answer;
                                    }
                                }
                                data.push(ans, (ansId == -1) ? result['q' + questions[l].question_order + '.value'] : null);
                                break;
                            case 'text-answer':
                                data.push(result['q' + questions[l].question_order + '.value']);
                                break;
                            case 'explanatory-text':
                                break;
                            default:
                                return new Error("Question type not contemplated.");
                        }
                    }
                    return data;
                }
            }
        );
    };

    pgQueryToCsv = function(queryResult) {
        return csv.writeToStringAsync(
            queryResult.rows,
            {
                headers: true,
                delimiter: ';'
            }
        );
    };

    extractQuestionsMapFromRequest = function(req) {
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
                    var answers = [];
                    for (var j = 1; true; j++) {
                        if (!req.body['option_' + i + '_' + j]) {
                            break;
                        }
                        answers.push({
                            answer : req.body['option_' + i + '_' + j],
                            legend : req.body['option_' + i + '_' + j + '_color'],
                            id : null,
                            imageUrl : null,
                            order: j
                        });
                    }
                    if (('responses_' + i + '_other') in req.body) {
                        answers.push({
                            answer : req.body['option_' + i + '_other'],
                            legend : req.body['option_' + i + '_other_color'],
                            id : null,
                            imageUrl : null,
                            order: -1
                        });
                    }
                    questions.push({
                        question : req.body['question_' + i],
                        type: req.body['question_type_' + i],
                        answers : answers
                    });
                    break;
                case 'text-answer':
                case 'explanatory-text':
                    if (req.body['question_' + i].trim() === '') {
                        break;
                    }
                    questions.push({
                        question : req.body['question_' + i],
                        type: req.body['question_type_' + i]
                    });
                    break;
                default:
                    return new Error("Question type not contemplated.");
            }
        }
        return questions;
    };

    extractQuestionsMapFromSurvey = function(survey) {
        return Promise.map(survey.getQuestions({
            scope: 'includeAnswers'
        }), function(question) {
            switch (question.type) {
                case 'list-radio':
                case 'list-radio-other':
                    var answers = [];
                    var otherAnswer = null;
                    for (var i = 0, iLen = question.Answers.length; i<iLen; i++) {
                        if (question.Answers[i].sortorder != -1) {
                            answers.push({
                                answer : question.Answers[i].answer,
                                legend : question.Answers[i].legend,
                                id : question.Answers[i].id,
                                imageUrl : (question.Answers[i].img !== null && question.Answers[i].img.length > 0) ? '/answer_img/' + question.Answers[i].id : null,
                                order : question.Answers[i].sortorder
                            });
                        } else {
                            otherAnswer = {
                                answer : question.Answers[i].answer,
                                legend : question.Answers[i].legend,
                                id : question.Answers[i].id,
                                imageUrl : (question.Answers[i].img !== null && question.Answers[i].img.length > 0) ? '/answer_img/' + question.Answers[i].id : null,
                                order : question.Answers[i].sortorder
                            };
                        }
                    }
                    if (otherAnswer !== null) {
                        answers.push(otherAnswer);
                    }
                    return {
                        question: question.question,
                        type: (question.type == 'list-radio-other') ? 'list-radio' : question.type,
                        answers: answers
                    };
                case 'text-answer':
                case 'explanatory-text':
                    return {
                        question: question.question,
                        type: question.type
                    };
                default:
                    return new Error("Question type not contemplated.");
            }
        });
    };
};
