var Promise = require('bluebird'),
    csv = Promise.promisifyAll(require('fast-csv')),
    moment = require('moment'),
    XLSX = require('excel4node'),
    sequelize = models.sequelize;

module.exports = function(app) {

    // Function for ordering the votes in descending order
    function orderVotesDesc(results) {
        var orderedVotes = {},
            question;
        for (var j in results) {
            if (j !== 'name' && j !== 'total_responses' && j !== 'iso_code' &&
                j !== 'country_id' && j !== 'adm_code' && j !== 'adm_type' &&
                j !== 'country_iso_code' &&  j !== 'geojson') {
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
                    if (orderedVotes[question][k].nr < parseInt(results[j], 10)) {
                        position = k;
                        break;
                    }
                }
                orderedVotes[question].splice(position, 0, {nr: parseInt(results[j], 10), name: j});
            }
        }
        return orderedVotes;
    }

    function addResultsXlsxSheet(wb, questions, results, i18n) {
        var ws = wb.addWorksheet(i18n.__('export_sheet_answers')),
            headerStyle = wb.createStyle({
                font: {
                    color: '#000000',
                    size: 11,
                    bold: true
                },
                fill: {
                    type: 'pattern',
                    patternType: 'solid',
                    fgColor: '#a9a9a9'
                },
                alignment: {
                    horizontal: 'center',
                    vertical: 'center',
                    wrapText: true
                }
            }),
            border = {
                style: 'thin',
                color: '#000000'
            },
            borderStyle = wb.createStyle({
                border: {
                    left: border,
                    right: border,
                    bottom: border,
                    top: border
                }
            }),
            headers = [i18n.__('export_header_date_time'),
                i18n.__('export_header_latitude'),
                i18n.__('export_header_longitude'),
                i18n.__('export_header_country'),
                i18n.__('export_header_country_iso_code'),
                i18n.__('export_header_region'),
                i18n.__('export_header_region_code'),
                i18n.__('export_header_municipality') + ' ' + i18n.__('export_suffix_spain_only'),
                i18n.__('export_header_municipality_code') + ' ' + i18n.__('export_suffix_spain_only')],
            baseHeadersNr = headers.length,
            finalResults = [],
            urlColumns = [];

        for (var i = 0, iLen = questions.length; i < iLen; i++) {
            switch (questions[i].type) {
                case 'list-radio':
                    headers.push(questions[i].question);
                    break;
                case 'list-radio-other':
                    var otherAns = null;
                    for (var j = 0, jLen = questions[i].Answers.length; j < jLen; j++) {
                        if (questions[i].Answers[j].sortorder === -1) {
                            otherAns = questions[i].Answers[j];
                            break;
                        }
                    }
                    var otherName = (otherAns === null) ? 'other value' : otherAns.answer;
                    headers.push(questions[i].question, questions[i].question + ' - ' + otherName);
                    break;
                case 'image-upload':
                case 'image-url':
                    urlColumns.push(headers.length + 1);
                    // fall-through
                case 'text-answer':
                case 'long-text-answer':
                    headers.push(questions[i].question);
                    break;
                case 'explanatory-text':
                    break;
                default:
                    return new Error("Question type not contemplated.");
            }
        }
        finalResults.push(headers);

        for (var i = 0, iLen = results.length; i < iLen; i++) {
            var result = results[i],
                data = [];
            data.push(new Date(parseInt(result.timestamp, 10)),
                result.lat, result.lon, result.country, result.country_iso,
                result.province, result.province_code, result.municipality,
                result.municipality_code);
            for (var l = 0, lLen = questions.length; l < lLen; l++) {
                var ansId, ans;
                switch (questions[l].type) {
                    case 'list-radio':
                        ans = ansId = parseInt(result['q' + questions[l].question_order + '.id'], 10);
                        for (var m = 0, mLen = questions[l].Answers.length; m < mLen; m++) {
                            if (ansId === questions[l].Answers[m].sortorder) {
                                ans = questions[l].Answers[m].answer;
                            }
                        }
                        data.push(ans);
                        break;
                    case 'list-radio-other':
                        ans = ansId = parseInt(result['q' + questions[l].question_order + '.id'], 10);
                        for (var n = 0, nLen = questions[l].Answers.length; n < nLen; n++) {
                            if (ansId === questions[l].Answers[n].sortorder) {
                                ans = questions[l].Answers[n].answer;
                            }
                        }
                        data.push(ans, (ansId === -1) ? result['q' + questions[l].question_order + '.value'] : null);
                        break;
                    case 'text-answer':
                    case 'long-text-answer':
                    case 'image-url':
                        data.push(result['q' + questions[l].question_order + '.value']);
                        break;
                    case 'image-upload':
                        data.push(result['q' + questions[l].question_order + '.value'] ? Utils.getApplicationBaseURL() + result['q' + questions[l].question_order + '.value'] : null);
                        break;
                    case 'explanatory-text':
                        break;
                    default:
                        return new Error("Question type not contemplated.");
                }
            }
            finalResults.push(data);
        }

        ws.cell(1, 1, 1, baseHeadersNr, true).string(i18n.__('export_header_metadata')).style(headerStyle).style(borderStyle);
        ws.cell(1, baseHeadersNr + 1, 1, finalResults[0].length, true).string(i18n.__('export_header_answers')).style(headerStyle).style(borderStyle);

        ws.row(1).setHeight(25);
        ws.row(2).setHeight(50).freeze();

        for (var j = 0, jLen = finalResults[0].length; j<jLen; j++) {
            ws.cell(2, j + 1).string(finalResults[0][j]).style(headerStyle).style(borderStyle);
        }

        for (var i = 1, iLen = finalResults.length; i<iLen; i++) {
            ws.cell(i + 2, 1).date(finalResults[i][0]).style(borderStyle);
            ws.cell(i + 2, 2).number(finalResults[i][1]).style(borderStyle);
            ws.cell(i + 2, 3).number(finalResults[i][2]).style(borderStyle);
            for (var j = 3, jLen = finalResults[i].length; j<jLen; j++) {
                var cell = ws.cell(i + 2, j + 1).string(finalResults[i][j] !== null ? finalResults[i][j] : '').style(borderStyle);
                if (urlColumns.indexOf(j + 1) !== -1 && finalResults[i][j] !== null) {
                    cell.link(finalResults[i][j]);
                }
            }
        }

        var widths = {};
        for (var i = 0, iLen = finalResults.length; i<iLen; i++) {
            for (var j = 0, jLen = finalResults[i].length; j<jLen; j++) {
                widths[j] = Math.max(widths[j] ? widths[j] : 0,
                    finalResults[i][j] ? finalResults[i][j].toString().length : 0);
            }
        }
        for (var i = 0, iLen = finalResults[0].length; i<iLen; i++) {
            ws.column(i + 1).setWidth(Math.min(widths[i] + 2, 30));
        }
    }

    function addQuestionStatsXlsxSheet(wb, questions, results, i18n) {
        var ws = wb.addWorksheet(i18n.__('export_sheet_question_stats')),
            headerStyle = wb.createStyle({
                font: {
                    color: '#000000',
                    size: 11,
                    bold: true
                },
                fill: {
                    type: 'pattern',
                    patternType: 'solid',
                    fgColor: '#a9a9a9'
                },
                alignment: {
                    horizontal: 'center',
                    vertical: 'center',
                    wrapText: true
                }
            }),
            shareStyle = wb.createStyle({
                numberFormat: '0.0%'
            }),
            boldStyle = wb.createStyle({
                font: {
                    bold: true
                }
            }),
            italicStyle = wb.createStyle({
                font: {
                    italics: true
                }
            }),
            border = {
                style: 'thin',
                color: '#000000'
            },
            borderStyle = wb.createStyle({
                border: {
                    left: border,
                    right: border,
                    bottom: border,
                    top: border
                }
            }),
            questionsList = {};

        for (var i = 0, iLen = questions.length; i < iLen; i++) {
            switch (questions[i].type) {
                case 'list-radio-other':
                case 'list-radio':
                    questionsList[questions[i].question_order] = {
                        question: questions[i].question,
                        answers: {}
                    };
                    for (var j = 0, jLen = questions[i].Answers.length; j < jLen; j++) {
                        var answer = questions[i].Answers[j];
                        questionsList[questions[i].question_order].answers[answer.sortorder] = {
                            answer: answer.answer,
                            nr: 0
                        };
                    }
                    break;
            }
        }

        for (var i = 0, iLen = results.length; i < iLen; i++) {
            for (var qstn in questionsList) {
                if (('q' + qstn + '.id') in results[i]) {
                    questionsList[qstn].answers[results[i]['q' + qstn + '.id']].nr++;
                }
            }
        }

        var row = 1,
            questionsIds = Object.keys(questionsList);

        for (var i = 0, iLen = questionsIds.length; i < iLen; i++) {
            var question = questionsList[questionsIds[i]],
                answerIds = Object.keys(question.answers);

            answerIds.sort(function(a, b) {
                // -1 is other option and should always go in last place
                return ((b < 0 && a > b) || (b >= 0 && a >= 0 && a < b)) ? -1 : 1;
            });

            ws.cell(row, 1).string(i18n.__('export_header_question')).style(headerStyle).style({
                border: {
                    left: border,
                    bottom: border,
                    top: border
                }
            });

            ws.cell(row, 2).number(parseInt(questionsIds[i], 10) + 1).style(headerStyle).style({
                border: {
                    bottom: border,
                    top: border
                }
            });

            ws.cell(row, 3, row, 5, true).string(question.question).style(headerStyle).style(borderStyle);

            row += 2;

            ws.cell(row, 1, row, 3, true).string(i18n.__('export_header_answer')).style(borderStyle).style(boldStyle);
            ws.cell(row, 4).string(i18n.__('export_header_nr_answers')).style(borderStyle).style(boldStyle);
            ws.cell(row++, 5).string(i18n.__('export_header_share_answers')).style(borderStyle).style(boldStyle);

            for (var j = 0, jLen = answerIds.length; j < jLen; j++) {
                var answer = question.answers[answerIds[j]];
                ws.cell(row, 1, row, 3, true).string(answer.answer).style(borderStyle);
                ws.cell(row, 4).number(answer.nr).style(boldStyle).style(borderStyle);
                ws.cell(row, 5).formula('D' + row + '/D$' + (row++ + (jLen - j))).style(boldStyle).style(shareStyle).style(borderStyle);
            }

            ws.cell(row, 1, row, 3, true).string(i18n.__('export_header_total')).style(italicStyle).style(borderStyle);
            ws.cell(row, 4).formula('sum(D' + (row - answerIds.length) + ':D' + (row - 1) + ')').style(italicStyle).style(boldStyle).style(borderStyle);

            row += 3;
        }

        ws.column(1).setWidth(10);
        ws.column(2).setWidth(3);
        ws.column(3).setWidth(35);
        ws.column(4).setWidth(20);
        ws.column(5).setWidth(20);
    }

    function addLocationStatsXlsxSheet(wb, results, i18n) {
        var ws = wb.addWorksheet(i18n.__('export_sheet_location_stats')),
            headerStyle = wb.createStyle({
                font: {
                    color: '#000000',
                    size: 11,
                    bold: true
                },
                fill: {
                    type: 'pattern',
                    patternType: 'solid',
                    fgColor: '#a9a9a9'
                },
                alignment: {
                    horizontal: 'center',
                    vertical: 'center',
                    wrapText: true
                }
            }),
            shareStyle = wb.createStyle({
                numberFormat: '0.0%'
            }),
            boldStyle = wb.createStyle({
                font: {
                    bold: true
                }
            }),
            italicStyle = wb.createStyle({
                font: {
                    italics: true
                }
            }),
            border = {
                style: 'thin',
                color: '#000000'
            },
            borderStyle = wb.createStyle({
                border: {
                    left: border,
                    right: border,
                    bottom: border,
                    top: border
                }
            }),
            countries = {},
            provinces = {},
            municipalities = {};

        for (var i = 0, iLen = results.length; i < iLen; i++) {
            var result = results[i];
            if (result.country_iso) {
                if (!(countries[result.country_iso])) {
                    countries[result.country_iso] = {
                        name: result.country,
                        nr: 0
                    };
                }
                countries[result.country_iso].nr++;
            }
            if (result.province_code) {
                if (!(provinces[result.province_code])) {
                    provinces[result.province_code] = {
                        name: result.province,
                        nr: 0,
                        country: result.country_iso
                    };
                }
                provinces[result.province_code].nr++;
            }
            if (result.municipality_code) {
                if (!(municipalities[result.municipality_code])) {
                    municipalities[result.municipality_code] = {
                        name: result.municipality,
                        nr: 0,
                        province: result.province_code
                    };
                }
                municipalities[result.municipality_code].nr++;
            }
        }

        var row = 1,
            countriesCodes = Object.keys(countries),
            provincesCodes = Object.keys(provinces),
            municipalitiesCodes = Object.keys(municipalities);

        countriesCodes.sort();
        provincesCodes.sort();
        municipalitiesCodes.sort();

        ws.cell(row, 1, row, 7, true).string(i18n.__('export_header_countries_with_answers')).style(headerStyle).style(borderStyle);
        ws.cell(row, 8).number(countriesCodes.length).style(headerStyle).style(borderStyle);

        if (countriesCodes.length > 0) {
            row += 2;
            ws.cell(row, 5).string(i18n.__('export_header_country')).style(boldStyle).style(borderStyle);
            ws.cell(row, 6).string(i18n.__('export_header_country_iso_code')).style(boldStyle).style(borderStyle);
            ws.cell(row, 7).string(i18n.__('export_header_nr_answers')).style(boldStyle).style(borderStyle);
            ws.cell(row++, 8).string(i18n.__('export_header_share_answers')).style(boldStyle).style(borderStyle);
            var firstRow = row;
            for (var i = 0, iLen = countriesCodes.length; i < iLen; i++) {
                var code = countriesCodes[i],
                    country = countries[code];
                ws.cell(row, 5).string(country.name).style(borderStyle);
                ws.cell(row, 6).string(code).style(borderStyle);
                ws.cell(row, 7).number(country.nr).style(boldStyle).style(borderStyle);
                ws.cell(row, 8).formula('G' + row + '/G$' + (row++ + (iLen - i))).style(boldStyle).style(shareStyle).style(borderStyle);
            }
            ws.cell(row, 5, row, 6, true).string(i18n.__('export_header_total')).style(italicStyle).style(borderStyle);
            ws.cell(row, 7).formula('sum(G' + firstRow + ':G' + (row++ - 1) + ')').style(boldStyle).style(italicStyle).style(borderStyle);
        }

        row += 2;

        ws.cell(row, 1, row, 7, true).string(i18n.__('export_header_provinces_with_answers')).style(headerStyle).style(borderStyle);
        ws.cell(row, 8).number(provincesCodes.length).style(headerStyle).style(borderStyle);

        if (provincesCodes.length > 0) {
            row += 2;
            ws.cell(row, 3).string(i18n.__('export_header_region')).style(boldStyle).style(borderStyle);
            ws.cell(row, 4).string(i18n.__('export_header_region_code')).style(boldStyle).style(borderStyle);
            ws.cell(row, 5).string(i18n.__('export_header_country')).style(boldStyle).style(borderStyle);
            ws.cell(row, 6).string(i18n.__('export_header_country_iso_code')).style(boldStyle).style(borderStyle);
            ws.cell(row, 7).string(i18n.__('export_header_nr_answers')).style(boldStyle).style(borderStyle);
            ws.cell(row++, 8).string(i18n.__('export_header_share_answers')).style(boldStyle).style(borderStyle);
            var firstRow = row;
            for (var i = 0, iLen = provincesCodes.length; i < iLen; i++) {
                var code = provincesCodes[i],
                    province = provinces[code],
                    country = countries[province.country];
                ws.cell(row, 3).string(province.name).style(borderStyle);
                ws.cell(row, 4).string(code).style(borderStyle);
                ws.cell(row, 5).string(country.name).style(borderStyle);
                ws.cell(row, 6).string(province.country).style(borderStyle);
                ws.cell(row, 7).number(province.nr).style(boldStyle).style(borderStyle);
                ws.cell(row, 8).formula('G' + row + '/G$' + (row++ + (iLen - i))).style(boldStyle).style(shareStyle).style(borderStyle);
            }
            ws.cell(row, 3, row, 6, true).string(i18n.__('export_header_total')).style(italicStyle).style(borderStyle);
            ws.cell(row, 7).formula('sum(G' + firstRow + ':G' + (row++ - 1) + ')').style(boldStyle).style(italicStyle).style(borderStyle);
        }

        row += 2;

        ws.cell(row, 1, row, 7, true).string(i18n.__('export_header_municipalities_with_answers') + ' ' + i18n.__('export_suffix_spain_only')).style(headerStyle).style(borderStyle);
        ws.cell(row, 8).number(municipalitiesCodes.length).style(headerStyle).style(borderStyle);

        if (municipalitiesCodes.length > 0) {
            row += 2;
            ws.cell(row, 1).string(i18n.__('export_header_municipality')).style(boldStyle).style(borderStyle);
            ws.cell(row, 2).string(i18n.__('export_header_municipality_code')).style(boldStyle).style(borderStyle);
            ws.cell(row, 3).string(i18n.__('export_header_region')).style(boldStyle).style(borderStyle);
            ws.cell(row, 4).string(i18n.__('export_header_region_code')).style(boldStyle).style(borderStyle);
            ws.cell(row, 5).string(i18n.__('export_header_country')).style(boldStyle).style(borderStyle);
            ws.cell(row, 6).string(i18n.__('export_header_country_iso_code')).style(boldStyle).style(borderStyle);
            ws.cell(row, 7).string(i18n.__('export_header_nr_answers')).style(boldStyle).style(borderStyle);
            ws.cell(row++, 8).string(i18n.__('export_header_share_answers')).style(boldStyle).style(borderStyle);
            for (var i = 0, iLen = municipalitiesCodes.length; i < iLen; i++) {
                var code = municipalitiesCodes[i],
                    municipality = municipalities[code],
                    province = provinces[municipality.province],
                    country = countries[province.country];
                ws.cell(row, 1).string(municipality.name).style(borderStyle);
                ws.cell(row, 2).string(code).style(borderStyle);
                ws.cell(row, 3).string(province.name).style(borderStyle);
                ws.cell(row, 4).string(municipality.province).style(borderStyle);
                ws.cell(row, 5).string(country.name).style(borderStyle);
                ws.cell(row, 6).string(province.country).style(borderStyle);
                ws.cell(row, 7).number(municipality.nr).style(boldStyle).style(borderStyle);
                ws.cell(row, 8).formula('G' + row + '/G$' + (row++ + (iLen - i))).style(boldStyle).style(shareStyle).style(borderStyle);
            }
            ws.cell(row, 1, row, 6, true).string(i18n.__('export_header_total')).style(italicStyle).style(borderStyle);
            ws.cell(row, 7).formula('sum(G' + (row - municipalitiesCodes.length) + ':G' + (row++ - 1) + ')').style(boldStyle).style(italicStyle).style(borderStyle);
        }

        ws.column(1).setWidth(25);
        for (var i = 2, iLen = 8; i <= iLen; i++) {
            ws.column(i).setWidth(20);
        }
    }

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

    addIndivVotePopupMessage = function(results, questions, answers, req) {
        var msg;
        for (var i = 0, iLen = results.length; i<iLen; i++) {
            msg = "<ul class='user-answers-list'>";
            for (var j = 0, jLen = questions.length; j<jLen; j++) {
                switch (questions[j].type) {
                    case 'list-radio':
                    case 'list-radio-other':
                        var value,
                            answer = null;
                        for (var k = 0, kLen = answers[questions[j].question_order].length; k<kLen; k++) {
                            if (answers[questions[j].question_order][k].sortorder === parseInt(results[i]['q' + questions[j].question_order + '.id'], 10)) {
                                answer = answers[questions[j].question_order][k];
                                break;
                            }
                        }
                        if (answer !== null) {
                            if ((answer.sortorder === -1) && (('q' + questions[j].question_order + '.value') in results[i])) {
                                value = answer.answer + ' (' + results[i]['q' + questions[j].question_order + '.value'] + ')';
                            } else {
                                value = answer.answer;
                            }
                        } else {
                            value = results[i]['q' + questions[j].question_order + '.id'];
                        }
                        msg += "<li><label>" + questions[j].question + ':<br></label><span>' + value + '</span></li>';
                        break;
                    case 'text-answer':
                    case 'long-text-answer':
                        if (results[i]['q' + questions[j].question_order + '.value'] && results[i]['q' + questions[j].question_order + '.value'].trim()){
                            msg += "<li><label>" + questions[j].question + ':<br></label><span>' + results[i]['q' + questions[j].question_order + '.value'].trim() + '</span></li>';
                        }
                        break;
                    case 'image-upload':
                    case 'image-url':
                        if (results[i]['q' + questions[j].question_order + '.value'] && results[i]['q' + questions[j].question_order + '.value'].trim()){
                            msg += "<li><label>" + questions[j].question + ':</label><div class="survey-answer-img"><a href="' +
                                results[i]['q' + questions[j].question_order + '.value'].trim() + '" target="_blank"><img title="' +
                                req.i18n.__('click_image_full_size') + '"  class="' + questions[j].type + '" src="' +
                                results[i]['q' + questions[j].question_order + '.value'].trim() + '"></img></a></div></li>';
                        }
                        break;
                    case 'explanatory-text':
                        break;
                    default:
                        return new Error("Question type not contemplated.");
                }
            }
            results[i].popup_msg = msg + '</ul>';
        }
        return results;
    };

    addAggregatedVotesPopupMessage = function(results, questions, answers) {
        var msg;
        for (var i = 0, iLen = results.length; i<iLen; i++) {
            var popup = '<h3><small>' + results[i].name + '</small></h3>',
                popupProperties = '',
                orderedVotes = orderVotesDesc(results[i]),
                question;
            for (var l in orderedVotes) {
                if ({}.hasOwnProperty.call(orderedVotes, l)) {
                    question = null;
                    for (var q = 0, qLen = questions.length; q<qLen; q++) {
                        if ('q' + questions[q].question_order === l) {
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
                                if (answers[question.question_order][n].sortorder === orderedVotes[l][m].name.split('_')[1]) {
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
            }
            results[i].popup_msg = popup + popupProperties + '<small>Votos totales:</small> ' + results[i].total_responses;
        }
        return results;
    };

    pgQueryFullResultsToCsv = function(results, questions, i18n) {
        i18n = i18n ? i18n : Utils.getI18n();
        var headers = [i18n.__('export_header_date_time'),
                i18n.__('export_header_latitude'),
                i18n.__('export_header_longitude'),
                i18n.__('export_header_country'),
                i18n.__('export_header_country_iso_code'),
                i18n.__('export_header_region'),
                i18n.__('export_header_region_code'),
                i18n.__('export_header_municipality'),
                i18n.__('export_header_municipality_code')];
        for (var i = 0, iLen = questions.length; i < iLen; i++) {
            switch (questions[i].type) {
                case 'list-radio':
                    headers.push(questions[i].question);
                    break;
                case 'list-radio-other':
                    var otherAns = null;
                    for (var j = 0, jLen = questions[i].Answers.length; j < jLen; j++) {
                        if (questions[i].Answers[j].sortorder === -1) {
                            otherAns = questions[i].Answers[j];
                            break;
                        }
                    }
                    var otherName = (otherAns === null) ? 'other value' : otherAns.answer;
                    headers.push(questions[i].question, questions[i].question + ' - ' + otherName);
                    break;
                case 'text-answer':
                case 'long-text-answer':
                case 'image-upload':
                case 'image-url':
                    headers.push(questions[i].question);
                    break;
                case 'explanatory-text':
                    break;
                default:
                    return new Error("Question type not contemplated.");
            }
        }
        results.splice(0, 0, headers);
        return csv.writeToStringAsync(
            results,
            {
                headers: true,
                delimiter: ';',
                transform: function(result) {
                    // First line is always the header, which doesn't need transforming
                    if (results.indexOf(result) === 0) {
                        return result;
                    }
                    var data = [];
                    data.push(moment.utc(new Date(parseInt(result.timestamp, 10)).toISOString()).format(i18n.__('date_time_format_string')),
                        result.lat, result.lon, result.country, result.country_iso,
                        result.province, result.province_code, result.municipality,
                        result.municipality_code);
                    for (var l = 0, lLen = questions.length; l < lLen; l++) {
                        var ansId, ans;
                        switch (questions[l].type) {
                            case 'list-radio':
                                ans = ansId = parseInt(result['q' + questions[l].question_order + '.id'], 10);
                                for (var m = 0, mLen = questions[l].Answers.length; m < mLen; m++) {
                                    if (ansId === questions[l].Answers[m].sortorder) {
                                        ans = questions[l].Answers[m].answer;
                                    }
                                }
                                data.push(ans);
                                break;
                            case 'list-radio-other':
                                ans = ansId = parseInt(result['q' + questions[l].question_order + '.id'], 10);
                                for (var n = 0, nLen = questions[l].Answers.length; n < nLen; n++) {
                                    if (ansId === questions[l].Answers[n].sortorder) {
                                        ans = questions[l].Answers[n].answer;
                                    }
                                }
                                data.push(ans, (ansId === -1) ? result['q' + questions[l].question_order + '.value'] : null);
                                break;
                            case 'text-answer':
                            case 'long-text-answer':
                            case 'image-url':
                                data.push(result['q' + questions[l].question_order + '.value']);
                                break;
                            case 'image-upload':
                                data.push(result['q' + questions[l].question_order + '.value'] ? Utils.getApplicationBaseURL() + result['q' + questions[l].question_order + '.value'] : null);
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

    pgQueryFullResultsToXlsx = function(results, questions, i18n, addQuestionStats, addLocationStats) {
        i18n = i18n ? i18n : Utils.getI18n();
        var wb = new XLSX.Workbook({
            dateFormat: i18n.__('date_time_format_string'),
            author: 'Emapic'
        });
        addResultsXlsxSheet(wb, questions, results, i18n);
        if (addQuestionStats) {
            addQuestionStatsXlsxSheet(wb, questions, results, i18n);
        }
        if (addLocationStats) {
            addLocationStatsXlsxSheet(wb, results, i18n);
        }
        return wb.writeToBuffer();
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
        for (var i = 1;; i++) {
            if (!(('question_type_' + i) in req.body) || !(('question_' + i) in req.body)) {
                break;
            }
            var questionType = req.body['question_type_' + i].trim();
            if (questionType === '') {
                continue;
            }
            switch (questionType) {
                case 'list-radio':
                case 'list-radio-other':
                    var answers = [];
                    for (var j = 1;; j++) {
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
                case 'long-text-answer':
                case 'explanatory-text':
                case 'image-upload':
                case 'image-url':
                    if (req.body['question_' + i].trim() === '') {
                        break;
                    }
                    questions.push({
                        question : req.body['question_' + i],
                        type: req.body['question_type_' + i],
                        mandatory: (req.body['optional_question_' + i] === undefined)
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
                        if (question.Answers[i].sortorder !== -1) {
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
                        type: (question.type === 'list-radio-other') ? 'list-radio' : question.type,
                        answers: answers
                    };
                case 'text-answer':
                case 'long-text-answer':
                case 'image-url':
                case 'image-upload':
                    return {
                        question: question.question,
                        type: question.type,
                        mandatory: question.mandatory
                    };
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

    checkColumnExists = function(column, table, schema) {
        return sequelize.query("SELECT count(*) > 0 AS exists FROM information_schema.columns WHERE table_schema = :schema and table_name = :table and column_name = :column;", {
            type: sequelize.QueryTypes.SELECT,
            replacements: {
                schema: schema,
                table: table,
                column: column
            }
        });
    };

    checkColumnExistsRevertToDefault = function(column, table, schema, defaultCol) {
        return checkColumnExists(column, table, schema).then(function(result) {
            return result[0].exists ? column : defaultCol;
        });
    };
};
