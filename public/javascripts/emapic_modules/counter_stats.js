//
// Counter & stats code
//

var emapic = emapic || {};

(function(emapic) {

    var chartFeatures = [],
        scrollPanePending = false,
        counterFilterValues = {},
        // Flag needed in Chrome as a hack for its confusing handling of dragging
        // & click: always raises a click with a dragging if the process took less
        // than 300 ms, no matter how much you moved.
        counterStatsFilterBtnsFalseClick = false,
        totalCounterHtml = "<div id='app-total-counter'></div>" +
            "<div class='expand-btn show-extrasmall clickable' data-target='#app-total-counter-body' onclick='emapic.modules.counterStats.clickCounterStatsExpandBtn(this, event)'>\n" +
            "<span class='glyphicon glyphicon-triangle-bottom'>\n" +
            "<span class='glyphicon glyphicon-chevron-down'>\n" +
            "</span>\n" +
            "</span>\n" +
            "</div>",
        currentChartsLegend,
        currentVoteChart;

    emapic.modules = emapic.modules || {};
    emapic.modules.counterStats = emapic.modules.counterStats || {};

    emapic.modules.counterStats.orderVotes = false;

    emapic.modules.counterStats.filter = new emapic.Filter({
        applyFilter: function(feature) {
            for (var prop in counterFilterValues) {
                if (counterFilterValues[prop].length > 0 && $.inArray(feature.properties[prop], counterFilterValues[prop]) == -1) {
                    return false;
                }
            }
            return true;
        },
        clearFilter: function() {
            $('.counters-control .filter-btn').removeClass('active');
            counterFilterValues = {};
        },
        isFilterActive: function() {
            for (var prop in counterFilterValues) {
                if (counterFilterValues[prop].length > 0) {
                    return true;
                }
            }
            return false;
        },
        isFilterActiveOnQuestion: function(qstnId) {
            var prop = qstnId + '.id';
            return (prop in counterFilterValues && counterFilterValues[prop].length > 0);
        }
    });

    emapic.addFilter(emapic.modules.counterStats.filter);

    emapic.addViewsControls = emapic.utils.overrideFunction(emapic.addViewsControls, null, function() {
        var countersControl = L.control({position: 'topright'});
        countersControl.onAdd = function (map) {
            this._div = L.DomUtil.create('div', 'counters-control leaflet-bar');
            this._div.innerHTML = totalCounterHtml;
            return this._div;
        };
        countersControl.addTo(emapic.map);
        $('#vote-chart .reset').click(function() {
            currentVoteChart.filterAll();
            currentVoteChart.redraw();
        });
    });

    emapic.updateIndivVotesLayerControls = emapic.utils.overrideFunction(emapic.updateIndivVotesLayerControls, null, function() {
        var statusNr = {},
            features = emapic.indivVotesLayerData.features,
            filteredFeatures = [],
            counterFilterProperty;
        if (emapic.legend && emapic.legend.color) {
            counterFilterProperty = emapic.legend.color.question + '.id';
            if (!(counterFilterProperty in counterFilterValues)) {
                counterFilterValues[counterFilterProperty] = [];
            }
        }
        // Must filter the features manually without this module's own filter
        featureLoop:
            for (var i = 0, iLen = features.length; i<iLen; i++) {
                var feature = features[i];
                for (var j = 0, jLen = emapic.filters.length; j<jLen; j++) {
                    if (emapic.filters[j] !== emapic.modules.counterStats.filter && typeof emapic.filters[j].applyFilter === 'function' && !emapic.filters[j].applyFilter(feature)) {
                        continue featureLoop;
                    }
                }
                if (emapic.legend && emapic.legend.color) {
                    for (var prop in counterFilterValues) {
                        if (prop !== counterFilterProperty && counterFilterValues[prop].length > 0 && $.inArray(feature.properties[prop], counterFilterValues[prop]) == -1) {
                            continue featureLoop;
                        }
                    }
                }
                filteredFeatures.push(feature);
            }
        chartFeatures = [];
        var counterFilterProperty;
        if (emapic.legend && emapic.legend.color) {
            for (var i in emapic.legend.color.responses_array) {
                statusNr[emapic.legend.color.responses_array[i].id] = {nr: 0, position: i};
            }
            for (i = 0, len = filteredFeatures.length; i < len; i++) {
                chartFeatures.push(filteredFeatures[i]);
                if (filteredFeatures[i].properties[counterFilterProperty] in statusNr) {
                    statusNr[filteredFeatures[i].properties[counterFilterProperty]].nr++;
                }
            }
        }
        populateCounter(statusNr);
        if (!emapic.map.hasLayer(emapic.indivVotesLayer)) {
            $('#app-total-counter-list li button').prop('disabled', true);
        }
        if (!counterFilterProperty) {
            $('#app-total-counter-body').addClass('always-hide-important');
        }
    });

    emapic.disableIndivLayerExclusiveComponents = emapic.utils.overrideFunction(emapic.disableIndivLayerExclusiveComponents, null, function() {
        $('#app-total-counter-list li button').prop('disabled', true);
    });

    emapic.enableIndivLayerExclusiveComponents = emapic.utils.overrideFunction(emapic.enableIndivLayerExclusiveComponents, null, function() {
        $('#app-total-counter-list li button').prop('disabled', false);
    });

    function updateCounterTotal() {
        $('#app-total-counter-header-nr').html(emapic.getIndivVotesLayerLeafletLayers().length);
    }

    emapic.updateIndivVotesLayer = emapic.utils.overrideFunction(emapic.updateIndivVotesLayer, null, updateCounterTotal);

    function populateCounter(statusNr) {
        var wasUncollapsed = $('#app-total-counter-body').length && $('#app-total-counter-body').hasClass('in'),
            specificVotesHtml = '',
            orderedVotes = [],
            position,
            counterFilterProperty;
        if (emapic.legend && emapic.legend.color) {
            counterFilterProperty = emapic.legend.color.question + '.id';
        }
        for (var i in statusNr) {
            var element = {nr: parseInt(statusNr[i].nr), id: i, position: statusNr[i].position};
            if (emapic.modules.counterStats.orderVotes) {
                // We order the votes in descending order
                position = orderedVotes.length;
                for (var j in orderedVotes) {
                    if (orderedVotes[j].nr < element.nr) {
                        position = j;
                        break;
                    }
                }
                orderedVotes.splice(position, 0, element);
            } else {
                orderedVotes.push(element);
            }
        }
        for (i in orderedVotes) {
            var btnActive = counterFilterProperty && counterFilterValues[counterFilterProperty] && counterFilterValues[counterFilterProperty].length > 0 &&
                ($.inArray(emapic.legend.color.responses_array[orderedVotes[i].position].id, counterFilterValues[counterFilterProperty]) !== -1);
            specificVotesHtml += '<li><button type="button" class="btn btn-default filter-btn' + (btnActive ? ' active' : '') + '" aria-pressed="false" autocomplete="off" vote="' +
                emapic.utils.escapeHtml(orderedVotes[i].position) + '"><div class="circle-container"><div class="filter-btn-circle" style="background-color: ' + emapic.legend.color.responses[orderedVotes[i].id].legend + ';"></div></div><span>' + emapic.utils.escapeHtml(emapic.legend.color.responses[orderedVotes[i].id].value) + ': ' + orderedVotes[i].nr + '</span></button></li>';
        }
        $('#app-total-counter').html("<div id='app-total-counter-header'><h4 class='text-center'><span class='usericon glyphicon glyphicon-user'></span><span id='app-total-counter-header-nr'></span> <span class='glyphicon glyphicon-stats'></span></h4></div>\n" +
            "<div id='app-total-counter-body' class='always-show-not-extrasmall collapse" + (wasUncollapsed ? ' in' : '') + "'><div id='app-total-counter-list-container'><ul id='app-total-counter-list'>" + specificVotesHtml + "</ul></div></div>");
        updateCounterTotal();
        $('.counters-control').show();
        $('#app-total-counter-header').addClass('clickable');
        if (!(emapic.legend && emapic.legend.color && chartFeatures.length > 0)) {
            $('#stats-modal div.modal-body').hide();
        }
        $('#app-total-counter-header').click(function() {
            currentChartsLegend = setcurrentChartsLegend(emapic.legend.color);
            $('#stats-modal').modal('show');
            $('#vote-chart-clear').hide();
            // check if buttons should be disabled or not
                // firstQuestionNr = parseInt(emapic.fullLegend.color[0].question.split('q')[1]);
                // lastQuestionNr = parseInt(emapic.fullLegend.color[emapic.fullLegend.color.length-1].question.split('q')[1]);
            if (emapic.fullLegend.color && emapic.legend.color) {
                $('#prev-question-btn').attr('disabled', parseInt(emapic.legend.color.question.split('q')[1]) === parseInt(emapic.fullLegend.color[0].question.split('q')[1]));
                $('#next-question-btn').attr('disabled', parseInt(emapic.legend.color.question.split('q')[1]) === parseInt(emapic.fullLegend.color[emapic.fullLegend.color.length-1].question.split('q')[1]));
            }
            // hide buttons when only one question list
            if (emapic.fullLegend.color === undefined || emapic.fullLegend.color.length === 1){
                $('#next-question-btn').hide();
                $('#prev-question-btn').hide();
            }
            if (emapic.legend && emapic.legend.color && chartFeatures.length > 0) {
                updateQuestionTitle();
                emapic.modules.counterStats.loadStats(chartFeatures);
            }
        });
        if ($('#app-total-counter-body').css('display') != 'none') {
            $('#app-total-counter-list-container').jScrollPane();
        } else {
            scrollPanePending = true;
            $('#app-total-counter-body').on('shown.bs.collapse', function() {
                if (scrollPanePending) {
                    $('#app-total-counter-list-container').jScrollPane();
                    scrollPanePending = false;
                }
            });
        }
        $('#app-total-counter-list li button').on('click', clickCounterStatsFilterBtn);

        // A click cannot be made immediately after a touchmove (dragging), only after a touchstart (real click)
        // Hack for a problem with Chrome. See counterStatsFilterBtnsFalseClick above.
        $('#app-total-counter-list li button').on('touchmove', function(){counterStatsFilterBtnsFalseClick = true;});
        $('#app-total-counter-list li button').on('touchstart', function(){counterStatsFilterBtnsFalseClick = false;});

        emapic.utils.disableAllEventsPropagation(document.getElementsByClassName('counters-control')[0]);
    }

    emapic.modules.counterStats.clickCounterStatsExpandBtn = function(btn, event) {
        event.stopPropagation();
        var $btn = $(btn),
            $el = $btn.find('.glyphicon .glyphicon'),
            $target = $($btn.attr('data-target'));
        if ($target.hasClass('collapse')) {
            if ($target.hasClass('in')) {
                $el.removeClass('glyphicon-chevron-up');
                $el.addClass('glyphicon-chevron-down');
                $target.collapse('hide');
            } else {
                $el.removeClass('glyphicon-chevron-down');
                $el.addClass('glyphicon-chevron-up');
                $target.collapse('show');
            }
        }
    };

    function clickCounterStatsFilterBtn(event) {
        if (emapic.legend && emapic.legend.color) {
            var $btn = $(this),
                counterFilterProperty = emapic.legend.color.question + '.id',
                value = emapic.legend.color.responses_array[parseInt($btn.attr('vote'))].id;
            if (!counterStatsFilterBtnsFalseClick && counterFilterProperty in counterFilterValues) {
                var pos = $.inArray(value, counterFilterValues[counterFilterProperty]);
                if (pos !== -1) {
                    counterFilterValues[counterFilterProperty].splice(pos, 1);
                    $btn.removeClass('active');
                } else {
                    counterFilterValues[counterFilterProperty].push(value);
                    $btn.addClass('active');
                }
                emapic.applyFilters();
            }
        }
    }

    emapic.modules.counterStats.loadStats = function(data) {
        dc.chartRegistry.clear();

        var legendHeight = 18,
            maxLen = 0,
            width = 180,
            chartType = $('#chart-type-btn').attr('name'),
            votesById = {},
            votes = [],
            maxDataLen = 0;

        currentVoteChart = (chartType === 'pie') ? dc.pieChart("#vote-chart").cy(width/2) : dc.rowChart("#vote-chart");

        // Count the votes for each option
        for (var i = 0, iLen = data.length; i<iLen; i++) {
            if (data[i].properties[currentChartsLegend.color.question + '.id'] in votesById) {
                votesById[data[i].properties[currentChartsLegend.color.question + '.id']]++;
            } else {
                votesById[data[i].properties[currentChartsLegend.color.question + '.id']] = 1;
            }
        }

        // Add a row for each option with its nr of votes
        for (var j = 0, jLen = currentChartsLegend.color.responses_array.length; j<jLen; j++) {
            votes.push({
                value: currentChartsLegend.color.responses_array[j].id,
                nr: votesById[currentChartsLegend.color.responses_array[j].id] ? votesById[currentChartsLegend.color.responses_array[j].id] : 0
            });
            if (votes[j].nr > maxDataLen) {
                maxDataLen = votes[j].nr;
            }
        }

        //### Create Crossfilter Dimensions and Groups
        //See the [crossfilter API](https://github.com/square/crossfilter/wiki/API-Reference) for reference.
        var ndx = crossfilter(votes);
        var all = ndx.groupAll().reduce(function(p, d) {
            return p + d.nr;
        }, function(p, d) {
            return p - d.nr;
        }, function() {
            return 0;
        });
        // dimension by vote value
        var voteDimension = ndx.dimension(function (d) {
            return d.value;
        });
        // count by vote nr
        var voteDimensionGroup = voteDimension.group().reduceSum(function(d) {
            return d.nr;
        });

        // calculate max legend size between all questions (it depends on number of different answers)
        emapic.fullLegend.color.forEach(function(el) {
            if (el.responses_array.length > maxLen) {
                maxLen = el.responses_array.length;
            }
        });
        legendHeight = legendHeight * maxLen + width;

        (chartType == 'pie') ? configPieChart(currentVoteChart, width, legendHeight, voteDimension, voteDimensionGroup, all) : configRowChart(currentVoteChart, legendHeight, voteDimension, voteDimensionGroup, all, maxDataLen);

        //simply call renderAll() to render all charts on the page
        dc.renderAll();
    };

    emapic.modules.counterStats.chartTypeChanged = function(el) {
        chartFeatures = [];
        var btn = $('#chart-type-btn'),
            chartType = btn.attr('name');

        $('#vote-chart-clear').hide();

        if (currentChartsLegend && currentChartsLegend.color) {
            chartFeatures = emapic.indivVotesLayerData.features;
        }

        if (chartType === 'pie') {
            btn.attr('name', 'row');
            $('#pie-icon').show();
            $('#row-icon').hide();

        } else {
            btn.attr('name', 'pie');
            $('#pie-icon').hide();
            $('#row-icon').show();
        }

        emapic.modules.counterStats.loadStats(chartFeatures); // update chart
    };

    function configPieChart(voteChart, width, legendHeight, voteDimension, voteDimensionGroup, all) {
        voteChart
            .width(width) // (optional) define chart width, :default = 200
            .height(legendHeight) // (optional) define chart height, :default = 200
            .radius(0.45 * width) // define pie radius
            .dimension(voteDimension) // set dimension
            .group(voteDimensionGroup) // set group
            .legend(dc.legend().legendText(function(d) {
                return currentChartsLegend.color.responses[d.name].value + ': ' + d.data;
            }).y(width))
            .title(function(d) {
                var id = ('data' in d) ? d.data.key : d.key;
                return currentChartsLegend.color.responses[id].value + ": " + d.value;
            }).label(function (d) {
                var label = '';
                if (voteChart.hasFilter() && !voteChart.hasFilter(d.key)) {
                    return label + ' (0%)';
                }
                if (all.value()) {
                    label += ' (' + Math.floor(d.value / all.value() * 100) + '%)';
                }
                return label;
            })
            .colors(function(d){ return (d && currentChartsLegend && currentChartsLegend.color) ? currentChartsLegend.color.responses[d].legend : 'grey';}); // set colors function

        return voteChart;
    };

    function configRowChart(voteChart, legendHeight, voteDimension, voteDimensionGroup, all, maxDataLen) {
        voteChart
            .width(330) // (optional) define chart width, :default = 200
            .height(legendHeight) // (optional) define chart height, :default = 200
            .dimension(voteDimension) // set dimension
            .group(voteDimensionGroup) // set group
            .title(function(d) {
                var id = ('data' in d) ? d.data.key : d.key;
                return currentChartsLegend.color.responses[id].value + ": " + d.value;
            }).label(function (d) {
                var label = currentChartsLegend.color.responses[d.key].value;
                if (voteChart.hasFilter() && !voteChart.hasFilter(d.key)) {
                    return label + ' (0%)';
                }
                if (all.value()) {
                    label += ' (' + Math.floor(d.value / all.value() * 100) + '%)';
                }
                return label;
            })
            .colors(function(d){ return (d && currentChartsLegend && currentChartsLegend.color) ? currentChartsLegend.color.responses[d].legend : 'grey';}); // set colors function
            // if there are more than 3 answers in the most answered question, 4 ticks
            (maxDataLen > 3) ? voteChart.xAxis().ticks(4) : voteChart.xAxis().ticks(maxDataLen);

        return voteChart;
    };


    function getQuestionsLen() {
        return parseInt(emapic.fullLegend.color.length) - 1;
    }

    function getCurrentQuestionNr() {
        return parseInt(currentChartsLegend.color.question.split('q')[1]);
    }

    function getCurrentQuestionPosition() {
        for (i = 0, len = emapic.fullLegend.color.length; i < len; i++) {
            if (emapic.fullLegend.color[i].question === currentChartsLegend.color.question) {
                return i;
            }
        }
        return i;
    }

    function updateQuestionTitle() {
        $('#vote-chart-title').text(currentChartsLegend.color.text);
        $('#vote-chart-title').attr('name', getCurrentQuestionNr());
    }

    function setcurrentChartsLegend(legendColor) {
        if (legendColor !== undefined) { // there are question list in survey
            return currentChartsLegend = {
                color : {
                    question : legendColor.question,
                    responses : legendColor.responses,
                    responses_array : legendColor.responses_array,
                    text : legendColor.text
                }
            };
        } else { // there are not question list
            return undefined;
        }
    }

    function updateChart(n) {
        currentChartsLegend = setcurrentChartsLegend(emapic.fullLegend.color[n]);
        chartFeatures = [];
        $('#vote-chart-clear').hide();
        $('#prev-question-btn').attr('disabled', n === 0);
        $('#next-question-btn').attr('disabled', n === getQuestionsLen());
        if (currentChartsLegend && currentChartsLegend.color) {
            chartFeatures = emapic.indivVotesLayerData.features;
        }
        updateQuestionTitle();
        emapic.modules.counterStats.loadStats(chartFeatures); // update chart
    }

    emapic.modules.counterStats.prevQuestionChart = function () {
        var nr = getCurrentQuestionPosition() - 1;
        if (nr < 0) {
            return;
        }
        updateChart(nr);
    }

    emapic.modules.counterStats.nextQuestionChart = function () {
        var nr = getCurrentQuestionPosition() + 1;
        if (nr > getQuestionsLen()) {
            return;
        }
        updateChart(nr);
    }

})(emapic);
