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
        currentVoteChart;

    emapic.modules = emapic.modules || {};
    emapic.modules.counterStats = emapic.modules.counterStats || {};

    emapic.modules.counterStats.orderVotes = false;
    emapic.modules.counterStats.legendRowHeight = 18;
    emapic.modules.counterStats.useHTMLLegend = true;
    emapic.modules.counterStats.pieChartWidth = emapic.modules.counterStats.rowChartWidth = 500;
    emapic.modules.counterStats.pieChartRadius = 81;
    emapic.modules.counterStats.currentChartsLegend = null;
    emapic.modules.counterStats.counterIcon = "<span class='usericon glyphicon glyphicon-user'></span>";

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
        },
        getBriefDescription: function() {
            return emapic.utils.getI18n('js_counter_filter_brief_description', 'Filtro por respuestas');
        },
        getExportParameters: function() {
            var params = [];
            for (var prop in counterFilterValues) {
                for (var i = 0, len = counterFilterValues[prop].length; i<len; i++) {
                    params.push('filter_' + prop.replace('.id', '') + '=' + encodeURIComponent(counterFilterValues[prop][i]));
                }
            }
            return params;
        }
    });

    emapic.addFilter(emapic.modules.counterStats.filter);

    emapic.filtersUpdated = emapic.utils.overrideFunction(emapic.filtersUpdated, null, function() {
        updateFiltersSign();
    });

    function updateFiltersSign() {
        if (emapic.getActiveFilters().length > 0) {
            var tooltip = getFiltersTooltip();
            if (tooltip) {
                $('#app-total-counter-filter').tooltip({
                    container: 'body',
                    html: 'true',
                    placement: 'left',
                    title: tooltip
                });
            }
            $('#app-total-counter-filter').show();
        } else {
            $('#app-total-counter-filter').hide();
        }
    }

    function getFiltersTooltip() {
        var filters = emapic.getActiveFilters(),
            list = '';
        for (var i = 0, iLen = filters.length; i<iLen; i++) {
            var descr = filters[i].getBriefDescription();
            if (descr) {
                list += '<li>' + descr + '</li>';
            }
        }
        return list ? '<div id="active-filters-tooltip">' + emapic.utils.getI18n('js_filters_list_tooltip_header', 'Filtros actualmente activos') + ':<ul>' +
            list + '</ul></div>' : null;
    }

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
        var statusNr = [],
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
        chartFeatures = getChartFeatures();
        var counterFiltered = {};
        if (emapic.legend && emapic.legend.color) {
            for (var i in emapic.legend.color.responses_array) {
                counterFiltered[emapic.legend.color.responses_array[i].id] = 0;
            }
            for (i = 0, len = filteredFeatures.length; i < len; i++) {
                if (filteredFeatures[i].properties[counterFilterProperty] in counterFiltered) {
                    counterFiltered[filteredFeatures[i].properties[counterFilterProperty]]++;
                }
            }
            for (var i in emapic.legend.color.responses_array) {
                statusNr.push({id: emapic.legend.color.responses_array[i].id, nr: counterFiltered[emapic.legend.color.responses_array[i].id], position: i});
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
        $('#app-total-counter-filter').addClass('disabled');
    });

    emapic.enableIndivLayerExclusiveComponents = emapic.utils.overrideFunction(emapic.enableIndivLayerExclusiveComponents, null, function() {
        $('#app-total-counter-list li button').prop('disabled', false);
        $('#app-total-counter-filter').removeClass('disabled');
    });

    function updateCounterTotal() {
        $('#app-total-counter-header-nr').html(emapic.getIndivVotesLayerLeafletLayers().length);
    }

    emapic.updateIndivVotesLayer = emapic.utils.overrideFunction(emapic.updateIndivVotesLayer, null, updateCounterTotal);

    function addScrollBar() {
        var container = $('#app-total-counter-list-container');
        container.find('.span-container span').each(function() {
            var $this = $(this);
            $this.parents('.span-container').width($this.width() + 1);
        });
        if (container[0].scrollHeight > container[0].clientHeight) {
            container.jScrollPane();
        }
        container.addClass('after-scrollable');
    }

    function populateCounter(statusNr) {
        var wasUncollapsed = $('#app-total-counter-body').length && $('#app-total-counter-body').hasClass('in'),
            specificVotesHtml = '',
            orderedVotes = [],
            position,
            counterFilterProperty;
        if (emapic.legend && emapic.legend.color) {
            counterFilterProperty = emapic.legend.color.question + '.id';
        }
        for (var i = 0, len = statusNr.length; i<len; i++) {
            var element = {nr: parseInt(statusNr[i].nr), id: statusNr[i].id, position: statusNr[i].position};
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
                emapic.utils.escapeHtml(orderedVotes[i].position) + '"><div class="circle-container"><div class="filter-btn-circle" style="background-color: ' +
                emapic.legend.color.responses[orderedVotes[i].id].legend + ';"></div></div><div class="span-container"><span>' +
                emapic.utils.escapeHtml(emapic.legend.color.responses[orderedVotes[i].id].value) + ': ' + orderedVotes[i].nr + '</span></div></button></li>';
        }
        $('#app-total-counter').html("<div id='app-total-counter-header'><h4 class='text-center'>" + emapic.modules.counterStats.counterIcon + "<span id='app-total-counter-header-nr'></span> <span class='glyphicon glyphicon-stats'></span></h4></div>" +
            "<div id='app-total-counter-filter' style='display: none;'><span class='glyphicon glyphicon-filter'></span></div>\n" +
            "<div id='app-total-counter-body' class='always-show-not-extrasmall collapse" + (wasUncollapsed ? ' in' : '') + "'><div id='app-total-counter-list-container'><ul id='app-total-counter-list'>" + specificVotesHtml + "</ul></div></div>");
        updateCounterTotal();
        updateFiltersSign();
        $('.counters-control').show();
        $('#app-total-counter-header').addClass('clickable');
        if (!(emapic.legend && emapic.legend.color && chartFeatures.length > 0)) {
            $('#stats-modal div.modal-body').hide();
        } else {
            $('#stats-modal div.modal-body').show();
        }
        $('#app-total-counter-header').click(function() {
            emapic.modules.counterStats.currentChartsLegend = setcurrentChartsLegend(emapic.legend.color);
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
            addScrollBar();
        } else {
            scrollPanePending = true;
            $('#app-total-counter-body').on('shown.bs.collapse', function() {
                if (scrollPanePending) {
                    addScrollBar();
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

    function getChartFeatures() {
        var features = emapic.indivVotesLayerData.features,
            filteredFeatures = [];
        for (var i = 0, iLen = features.length; i<iLen; i++) {
            if (emapic.filterFeature(features[i])) {
                filteredFeatures.push(features[i]);
            }
        }
        return filteredFeatures;
    }

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
                emapic.filtersUpdated();
            }
        }
    }

    emapic.modules.counterStats.loadStats = function(data) {
        dc.chartRegistry.clear();

        var maxLen = 0,
            chartType = $('#chart-type-btn').attr('name'),
            radius = emapic.modules.counterStats.pieChartRadius,
            width = (chartType === 'pie') ? emapic.modules.counterStats.pieChartWidth : emapic.modules.counterStats.rowChartWidth,
            votesById = {},
            votes = [],
            maxDataLen = 0;

        // Count the votes for each option
        for (var i = 0, iLen = data.length; i<iLen; i++) {
            if (data[i].properties[emapic.modules.counterStats.currentChartsLegend.color.question + '.id'] in votesById) {
                votesById[data[i].properties[emapic.modules.counterStats.currentChartsLegend.color.question + '.id']]++;
            } else {
                votesById[data[i].properties[emapic.modules.counterStats.currentChartsLegend.color.question + '.id']] = 1;
            }
        }

        // Add a row for each option with its nr of votes
        for (var j = 0, jLen = emapic.modules.counterStats.currentChartsLegend.color.responses_array.length; j<jLen; j++) {
            votes.push({
                value: emapic.modules.counterStats.currentChartsLegend.color.responses_array[j].id,
                nr: votesById[emapic.modules.counterStats.currentChartsLegend.color.responses_array[j].id] ? votesById[emapic.modules.counterStats.currentChartsLegend.color.responses_array[j].id] : 0
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
        var legendHeight = emapic.modules.counterStats.legendRowHeight * maxLen;

        currentVoteChart = (chartType == 'pie') ? configPieChart(width, radius, legendHeight, voteDimension, voteDimensionGroup, all) :
            configRowChart(width, legendHeight * 3 + 30, legendHeight, voteDimension, voteDimensionGroup, all, maxDataLen);

        //simply call renderAll() to render all charts on the page
        dc.renderAll();

        // Transform the legend to HTML
        if (emapic.modules.counterStats.useHTMLLegend) {
            emapic.modules.counterStats.transformLegendToHTML(currentVoteChart);
        }
    };

    emapic.modules.counterStats.chartTypeChanged = function(el) {
        chartFeatures = [];
        var btn = $('#chart-type-btn'),
            chartType = btn.attr('name');

        $('#vote-chart-clear').hide();

        if (emapic.modules.counterStats.currentChartsLegend && emapic.modules.counterStats.currentChartsLegend.color) {
            chartFeatures = getChartFeatures();
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

    function configPieChart(width, radius, legendHeight, voteDimension, voteDimensionGroup, all) {
        var voteChart = dc.pieChart("#vote-chart").cy(width/2);

        voteChart
            .width(width)
            .height(radius * 2 + 30 + legendHeight)
            .cy(radius + 15)
            .radius(radius)
            .dimension(voteDimension)
            .group(voteDimensionGroup)
            .legend(dc.legend().legendText(function(d) {
                return emapic.modules.counterStats.currentChartsLegend.color.responses[d.name].value + ': ' + d.data;
            })
            .y(radius * 2 + 30))
            .title(function(d) {
                var id = ('data' in d) ? d.data.key : d.key;
                return emapic.modules.counterStats.currentChartsLegend.color.responses[id].value + ": " + d.value;
            })
            .label(function (d) {
                var label = '';
                if (voteChart.hasFilter() && !voteChart.hasFilter(d.key)) {
                    return label + ' (0%)';
                }
                if (all.value()) {
                    label += ' (' + Math.floor(d.value / all.value() * 100) + '%)';
                }
                return label;
            })
            .colors(function(d){
                return (d && emapic.modules.counterStats.currentChartsLegend && emapic.modules.counterStats.currentChartsLegend.color) ?
                    emapic.modules.counterStats.currentChartsLegend.color.responses[d].legend : 'grey';
            });

        return voteChart;
    };

    function configRowChart(width, chartHeight, legendHeight, voteDimension, voteDimensionGroup, all, maxDataLen) {
        var voteChart = dc.rowChart("#vote-chart");

        voteChart
            .width(width)
            .height(chartHeight)
            .margins({top: 5, right: 5, bottom: legendHeight + 30, left: 5})
            .dimension(voteDimension)
            .group(voteDimensionGroup)
            .title(function(d) {
                var id = ('data' in d) ? d.data.key : d.key;
                return emapic.modules.counterStats.currentChartsLegend.color.responses[id].value + ": " + d.value;
            })
            .label(function (d) {
                if (voteChart.hasFilter() && !voteChart.hasFilter(d.key)) {
                    return '(0%)';
                } else if (all.value()) {
                    return '(' + Math.floor(d.value / all.value() * 100) + '%)';
                } else {
                    return '---';
                }
            })
            .legend(dc.legend().legendText(function(d) {
                return emapic.modules.counterStats.currentChartsLegend.color.responses[d.name].value + ': ' + d.data;
            }).y(chartHeight - legendHeight))
            .colors(function(d){
                return (d && emapic.modules.counterStats.currentChartsLegend && emapic.modules.counterStats.currentChartsLegend.color) ?
                    emapic.modules.counterStats.currentChartsLegend.color.responses[d].legend : 'grey';
            });

            // if there are more than 3 answers in the most answered question, 4 ticks
            (maxDataLen > 3) ? voteChart.xAxis().ticks(4) : voteChart.xAxis().ticks(maxDataLen);

        /**
         * We have to add several legend-related functions manually because
         * the row charts in DC work with legends based on stacks instead of
         * individual rows
         */

        voteChart.legendables = function() {
            return voteChart.data().map(function (d, i) {
                var legendable = {name: d.key, data: d.value, others: d.others, chart: voteChart};
                legendable.color = voteChart.getColor(d, i);
                return legendable;
            });
        };

        voteChart.legendToggle = function(d) {
            this.onClick({key: d.name, others: d.others});
        };

        voteChart._highlightRowFromLegendable = function(legendable, highlighted) {
            this.selectAll('g.row').each(function (d) {
                if (legendable.name === d.key) {
                    d3.select(this).classed('highlight', highlighted);
                }
            });
        };

        voteChart.legendHighlight = function(d) {
            this._highlightRowFromLegendable(d, true);
        };

        voteChart.legendReset = function(d) {
            this._highlightRowFromLegendable(d, false);
        };

        return voteChart;
    };


    function getQuestionsLen() {
        return parseInt(emapic.fullLegend.color.length) - 1;
    }

    function getCurrentQuestionNr() {
        return parseInt(emapic.modules.counterStats.currentChartsLegend.color.question.split('q')[1]);
    }

    function getCurrentQuestionPosition() {
        for (i = 0, len = emapic.fullLegend.color.length; i < len; i++) {
            if (emapic.fullLegend.color[i].question === emapic.modules.counterStats.currentChartsLegend.color.question) {
                return i;
            }
        }
        return i;
    }

    function updateQuestionTitle() {
        $('#vote-chart-title').text(emapic.modules.counterStats.currentChartsLegend.color.text);
        $('#vote-chart-title').attr('name', getCurrentQuestionNr());
    }

    function setcurrentChartsLegend(legendColor) {
        if (legendColor !== undefined) { // there are question list in survey
            return {
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

    emapic.modules.counterStats.updateChart = function(n) {
        emapic.modules.counterStats.currentChartsLegend = setcurrentChartsLegend(emapic.fullLegend.color[n]);
        chartFeatures = [];
        $('#vote-chart-clear').hide();
        $('#prev-question-btn').attr('disabled', n === 0);
        $('#next-question-btn').attr('disabled', n === getQuestionsLen());
        if (emapic.modules.counterStats.currentChartsLegend && emapic.modules.counterStats.currentChartsLegend.color) {
            chartFeatures = getChartFeatures();
        }
        updateQuestionTitle();
        emapic.modules.counterStats.loadStats(chartFeatures); // update chart
    };

    emapic.modules.counterStats.prevQuestionChart = function () {
        var nr = getCurrentQuestionPosition() - 1;
        if (nr < 0) {
            return;
        }
        emapic.modules.counterStats.updateChart(nr);
    };

    emapic.modules.counterStats.nextQuestionChart = function () {
        var nr = getCurrentQuestionPosition() + 1;
        if (nr > getQuestionsLen()) {
            return;
        }
        emapic.modules.counterStats.updateChart(nr);
    };

    emapic.modules.counterStats.transformLegendToHTML = function(chart) {
        // We must parse the existing legend and copy it to an HTML table
        var $legend = $('#vote-chart .dc-legend');
        if (!$legend.length) {
            return;
        }
        var $legendContainer = $legend.parent(),
            originalHeight = $legend[0].getBoundingClientRect().height,
            coords = $legend.attr('transform').replace('translate(', '').replace(')', '').split(','),
            foreign = document.createElementNS('http://www.w3.org/2000/svg','foreignObject'),
            $foreign = $(foreign),
            legendRows = [];

        $legendContainer.addClass('dc-has-html-legend');

        $legend.find('.dc-legend-item').each(function() {
            // For each legend entry, transform its contents to a table row
            // and copy its event handlers
            var $this = $(this),
                $rect = $this.find('rect'),
                tr = document.createElement('tr'),
                $tr = $(tr);
            // Copy the internal data object
            tr.__data__ = this.__data__;
            if (this.__on) {
                // Copy the event handlers
                for (var i = 0, iLen = this.__on.length; i<iLen; i++) {
                    $tr.on(this.__on[i].type, this.__on[i].listener);
                }
            }
            $tr.html('<td class="dc-legend-table-rect"><div style="width:' + $rect.attr('width') + 'px;height:' + $rect.attr('height') +
                'px;background-color:' + $rect.attr('fill') + '"></div></td><td class="dc-legend-table-text"><label>' + $this.find('text').text() + '</label></td>');
            legendRows.push(tr);
        });

        // Set up the foreign object location and size based on the existing
        // legend data
        foreign.setAttribute('class', 'dc-legend-table');
        foreign.setAttribute('width', '100%');
        foreign.setAttribute('x', coords[0]);
        foreign.setAttribute('y', coords[1]);
        var table = document.createElement('table');
        for (var i = 0, iLen = legendRows.length; i<iLen; i++) {
            table.appendChild(legendRows[i]);
        }
        foreign.appendChild(table);
        $legendContainer.append(foreign);

        // Modify the chart height accordingly by computing the difference
        // between the old legend height and the new one
        var newHeight = $foreign.find('table').height(),
            heightDiff = parseFloat($legendContainer.attr('height')) + newHeight - originalHeight;
        $foreign.attr('height', newHeight + 'px');
        $legendContainer.attr('height', heightDiff);

        // Reset the height after each redraw
        chart.__originalRedraw = chart.redraw;
        chart.redraw = function() {
            this.__originalRedraw();
            $legendContainer.attr('height', heightDiff);
        };
    };

    function updateChartHeights() {
    }

})(emapic);
