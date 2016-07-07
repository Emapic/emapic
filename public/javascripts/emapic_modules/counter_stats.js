//
// Counter & stats code
//
var chartFeatures = [];
var scrollPanePending = false;
var counterFilterProperty = null;
var counterFilterValues = [];

// Flag needed in Chrome as a hack for its confusing handling of dragging
// & click: always raises a click with a dragging if the process took less
// than 300 ms, no matter how much you moved.
var counterStatsFilterBtnsFalseClick = false;

function getStatsTotalJsonUrl() {
    return "/api/survey/" + surveyId + "/totals";
}

var addViewsControls = overrideFunction(addViewsControls, null, function() {
    var countersControl = L.control({position: 'topright'});
    countersControl.onAdd = function (map) {
        this._div = L.DomUtil.create('div', 'counters-control leaflet-bar');
        this._div.innerHTML = "<div id='app-total-counter'></div>" + getCounterStatsExpandBtnHtml('app-total-counter-body');
        return this._div;
    };
    countersControl.addTo(map);
});

var updateIndivVotesLayerControls = overrideFunction(updateIndivVotesLayerControls, null, function() {
    var statusNr = {};
    layers = indivVotesLayer.getLayers();
    chartFeatures = [];
    if (legend && legend.color) {
        for (var i in legend.color.responses_array) {
            statusNr[legend.color.responses_array[i].id] = {nr: 0, position: i};
        }
        counterFilterProperty = legend.color.question + '.id';
        for (var i = 0, len = layers.length; i < len; i++) {
            chartFeatures.push(layers[i].feature);
            if (layers[i].feature.properties[counterFilterProperty] in statusNr) {
                statusNr[layers[i].feature.properties[counterFilterProperty]].nr++;
            }
        }
    }
    populateCounter(statusNr, layers.length);
    if (!map.hasLayer(indivVotesLayer)) {
        $('#app-total-counter-list li button').prop('disabled', true);
    }
    if (!counterFilterProperty) {
        $('#app-total-counter-body').addClass('always-hide-important');
    }
});

var disableIndivLayerExclusiveComponents = overrideFunction(disableIndivLayerExclusiveComponents, null, function() {
    $('#app-total-counter-list li button').prop('disabled', true);
});

var enableIndivLayerExclusiveComponents = overrideFunction(enableIndivLayerExclusiveComponents, null, function() {
    $('#app-total-counter-list li button').prop('disabled', false);
});

var clearFilters = overrideFunction(clearFilters, null, function() {
    counterFilterValues = [];
});

function loadStats(data) {
    dc.chartRegistry.clear();
    return data;
}

function populateCounter(statusNr, total) {
    var specificVotesHtml = '';
    var orderedVotes = [], position;
    // We order the votes in descending order
    for (var i in statusNr) {
        var position = orderedVotes.length;
        for (var j in orderedVotes) {
            if (orderedVotes[j].nr < parseInt(statusNr[i].nr)) {
                position = j;
                break;
            }
        }
        orderedVotes.splice(position, 0, {nr: parseInt(statusNr[i].nr), id: i, position: statusNr[i].position});
    }
    for (var i in orderedVotes) {
        specificVotesHtml += '<li><button type="button" class="btn btn-default" aria-pressed="false" autocomplete="off" vote="' + escapeHtml(orderedVotes[i].position) + '"><div class="circle-container"><div class="filter-btn-circle" style="background-color: ' + legend.color.responses[orderedVotes[i].id].legend + ';"></div></div><span>' + escapeHtml(legend.color.responses[orderedVotes[i].id].value) + ': ' + orderedVotes[i].nr + '</span></button></li>';
    }
    $('#app-total-counter').html("\
        <div id='app-total-counter-header'><h4 class='text-center'><span class='usericon glyphicon glyphicon-user'></span>" + total + " <span class='glyphicon glyphicon-stats'></span></h4></div>\
        <div id='app-total-counter-body' class='always-show-not-extrasmall collapse'><div id='app-total-counter-list-container'><ul id='app-total-counter-list'>" + specificVotesHtml + "</ul></div></div>\
    ");
    $('.counters-control').show();
    if (legend && legend.color && chartFeatures.length > 0) {
        $('#app-total-counter-header').addClass('clickable');
        $('#app-total-counter-header').click(function() {
            $('#stats-modal').modal('show');
            loadStats(chartFeatures);
        });
    }
    if ($('#app-total-counter-body').css('display') != 'none') {
        $('#app-total-counter-list-container').jScrollPane({
            contentWidth: '0px'
        });
    } else {
        scrollPanePending = true;
        $('#app-total-counter-body').on('shown.bs.collapse', function() {
            if (scrollPanePending) {
                $('#app-total-counter-list-container').jScrollPane({
                    contentWidth: '0px'
                });
                scrollPanePending = false;
            }
        });
    }
    $('#app-total-counter-list li button').on('click', clickCounterStatsFilterBtn);

    // A click cannot be made immediately after a touchmove (dragging), only after a touchstart (real click)
    // Hack for a problem with Chrome. See counterStatsFilterBtnsFalseClick above.
    $('#app-total-counter-list li button').on('touchmove', function(){counterStatsFilterBtnsFalseClick = true;});
    $('#app-total-counter-list li button').on('touchstart', function(){counterStatsFilterBtnsFalseClick = false;});

    disableAllEventsPropagation(document.getElementsByClassName('counters-control')[0]);
}

function getCounterStatsExpandBtnHtml(targetId) {
    return "<div class='expand-btn show-extrasmall clickable' data-target='#" + targetId + "' onclick='clickCounterStatsExpandBtn(this, event)'>\
        <span class='glyphicon glyphicon-triangle-bottom'>\
            <span class='glyphicon glyphicon-chevron-down'>\
            </span>\
        </span>\
      </div>";
}

function clickCounterStatsExpandBtn(btn, event) {
    event.stopPropagation();
    var $btn = $(btn);
    var $el = $btn.find('.glyphicon .glyphicon');
    var $target = $($btn.attr('data-target'));
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
}

function clickCounterStatsFilterBtn(event) {
    var $btn = $(this);
    var value = legend.color.responses_array[parseInt($btn.attr('vote'))].id;
    if (!counterStatsFilterBtnsFalseClick) {
        var pos = $.inArray(value, counterFilterValues);
        if (pos > -1) {
            counterFilterValues.splice(pos, 1);
            $btn.removeClass('active');
        } else {
            counterFilterValues.push(value);
            $btn.addClass('active');
        }
        updateIndivVotesLayer();
    }
}

var filterFeature = (function(){
    var originalFilterFeature = filterFeature;
    return function(feature, layer) {
        return (originalFilterFeature(feature, layer) && !(counterFilterProperty && (counterFilterValues.length > 0) && ($.inArray(feature.properties[counterFilterProperty], counterFilterValues) == -1)));
    }
})();
