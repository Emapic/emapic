//
// Time slider code
//
var minDate, maxDate;
var sliderDates = [];
var sliderDatesTooltip = [];
var sliderLevel;
var sliderDateFormats = [getI18n('js_full_date_format', 'j/n/Y'), getI18n('js_week_format', '\\S\\e\\m\\a\\n\\a W (\\d\\e\\l j/n/Y)'), 'F Y', 'Y'];
var filterDates;

var addViewsControls = overrideFunction(addViewsControls, null, function() {
    var timeControl = L.control({position: 'bottomleft'});
    timeControl.onAdd = function (map) {
        this._div = L.DomUtil.create('div', 'time-control hide-small leaflet-bar no-shadow');
        this._div.innerHTML = '<div id="time-control"><div class="select dropup" id="time-scale">\
            <button type="button" class="btn btn-default dropdown-toggle" data-toggle="dropdown" aria-expanded="false"><span id="1" class="selected" style="float: left;">' + getI18n('js_week', 'Semana') + '</span> <span class="caret"></span></button>\
            <ul class="dropdown-menu option" role="menu">\
            <li id="0" onclick="selectScale(this);return false;"><a href="#">' + getI18n('js_day', 'Día') + '</a></li>\
            <li id="1" onclick="selectScale(this);return false;"><a href="#">' + getI18n('js_week', 'Semana') + '</a></li>\
            <li id="2" onclick="selectScale(this);return false;"><a href="#">' + getI18n('js_month', 'Mes') + '</a></li>\
            <li id="3" onclick="selectScale(this);return false;"><a href="#">' + getI18n('js_year', 'Año') + '</a></li>\
            </ul>\
            </div><div id="time-slider"></div></div>';
        return this._div;
    };
    timeControl.addTo(map);
});

function selectScale(el) {
    var i = $(el).parents('.select').attr('id');
    var v = $(el).children().text();
    var o = $(el).attr('id');
    $('#'+i+' .selected').attr('id',o);
    $('#'+i+' .selected').text(v);
    changeSliderLevel(parseInt(o));
}

var disableIndivLayerExclusiveComponents = overrideFunction(disableIndivLayerExclusiveComponents, null, function() {
    // If there are no min/max dates, then we have no data to traverse
    if (!minDate) {
        return;
    }
    $('#time-scale button').prop('disabled', true);
    $('#time-slider').slider('disable');
});

var enableIndivLayerExclusiveComponents = overrideFunction(enableIndivLayerExclusiveComponents, null, function() {
    // If there are no min/max dates, then we have no data to traverse
    if (!minDate) {
        return;
    }
    $('#time-scale button').prop('disabled', false);
    $('#time-slider').slider('enable');
});

function sliderFilter(event, ui) {
    $(ui.handle).tooltip('hide')
        .attr('data-original-title', sliderDatesTooltip[sliderLevel][ui.value].format(sliderDateFormats[sliderLevel]))
        .tooltip('fixTitle');
    if (event.originalEvent) {
        filterDates = [sliderDates[sliderLevel][0][ui.values[0]], sliderDates[sliderLevel][1][ui.values[1]]];
        updateIndivVotesLayer();
        updateIndivVotesLayerControls();
    }
}

function processDataDates(data) {
    for (i=0, len=data.length; i < len; i++) {
        if (data[i].properties.timestamp != null) {
            dateObject = new Date(parseInt(data[i].properties.timestamp));
            data[i].properties.dateObject = dateObject;
            if (minDate == null || dateObject < minDate) {
                minDate = dateObject;
            }
            if (maxDate == null || dateObject > maxDate) {
                maxDate = dateObject;
            }
        }
    }
}

function initSlider(level) {
    // If there are no min/max dates, then we have no data to traverse
    if (!minDate) {
        $("#time-slider").slider({
            range: true,
            min: 0,
            max: 0,
            values: [0, 0]
        });
        $("#time-scale button").prop('disabled', true);
        $("#time-slider").slider('disable');
        return;
    }
    sliderLevel = level;
    // We check if we have already stored the dates for the current level
    if (typeof sliderDates[sliderLevel] === 'undefined') {
        // Arrays will contain min and max dates
        sliderDates[sliderLevel] = [[],[]];
        sliderDatesTooltip[sliderLevel] = [];
        if (level == 3) { // Year
            // For the min date we set January 1st 00:00:00
            d = new Date(minDate.getFullYear(), 0, 1, 0, 0, 0, 0);
            while (d < maxDate) {
                aux = new Date(d);
                sliderDates[sliderLevel][0].push(aux);
                d.setFullYear(d.getFullYear() + 1);
            };

            // For the max date we set December 31st 23:59:59
            d = new Date(minDate.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
            do {
                d.setFullYear(d.getFullYear() + 1);
                aux = new Date(d);
                sliderDates[sliderLevel][1].push(aux);
                // We also store the tooltip date
                sliderDatesTooltip[sliderLevel].push(aux);
            } while (d < maxDate);
        } else if (level == 2) { // Month
            // For the min date we set month's 1st 00:00:00
            d = new Date(minDate.getFullYear(), minDate.getMonth(), 1, 0, 0, 0, 0);
            while (d <= maxDate) {
                aux = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0,0);
                sliderDates[sliderLevel][0].push(aux);
                d.setMonth(d.getMonth() + 1);
            };

            // For the min date we set month's last day 23:59:59
            // which we'll obtain by sustracting one day from the next
            // month's 1st
            d = new Date(minDate.getFullYear(), minDate.getMonth(), 1, 0, 0, 0, 0);
            do {
                d.setMonth(d.getMonth() + 1);
                aux = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1, 23, 59, 59, 999);
                sliderDates[sliderLevel][1].push(aux);
                // We also store the tooltip date
                sliderDatesTooltip[sliderLevel].push(aux);
            } while (d <= maxDate);
        } else if (level == 1) { // Week
            // For the min date we set week's monday 00:00:00
            d = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate(), 0, 0, 0, 0);
            if (d.getDay() == 0) {
                d.setDate(d.getDate() - 6);
            } else {
                d.setDate(d.getDate() + 1 - d.getDay());
            }
            while (d < maxDate) {
                aux = new Date(d);
                sliderDates[sliderLevel][0].push(aux);
                d.setDate(d.getDate() + 7);
                // We also store the tooltip date (week's monday)
                sliderDatesTooltip[sliderLevel].push(aux);
            };

            // For the min date we set week's sunday 23:59:59
            d = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate() - 7, 23, 59, 59, 999);
            if (d.getDay() != 0) {
                d.setDate(d.getDate() + 7 - d.getDay());
            }
            do {
                d.setDate(d.getDate() + 7);
                aux = new Date(d);
                sliderDates[sliderLevel][1].push(aux);
            } while (d < maxDate);
        } else { // Day
            // For the min date we set day at 00:00:00
            d = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate(), 0, 0, 0, 0);
            while (d < maxDate) {
                aux = new Date(d);
                sliderDates[sliderLevel][0].push(aux);
                d.setDate(d.getDate() + 1);
            };

            // For the min date we set day at 23:59:59
            d = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate() - 1, 23, 59, 59, 999);
            do {
                d.setDate(d.getDate() + 1);
                aux = new Date(d);
                sliderDates[sliderLevel][1].push(aux);
                // We also store the tooltip date
                sliderDatesTooltip[sliderLevel].push(aux);
            } while (d < maxDate);
        }
    }
    $("#time-slider").slider({
        range: true,
        min: 0,
        max: sliderDates[sliderLevel][1].length == 1 ? -1 : sliderDates[sliderLevel][1].length - 1,
        values: [0, sliderDates[sliderLevel][1].length - 1],
        slide: sliderFilter,
        change: sliderFilter,
        start: function( event, ui ) {
                event.stopPropagation();
        }
    });
    filterDates = [sliderDates[sliderLevel][0], sliderDates[sliderLevel][sliderDates[sliderLevel][1].length - 1]];
    $('.ui-slider-handle:first').attr('title', sliderDatesTooltip[sliderLevel][0].format(sliderDateFormats[sliderLevel])).tooltip().tooltip('hide').tooltip('fixTitle');
    $('.ui-slider-handle:last').attr('title', sliderDatesTooltip[sliderLevel][sliderDatesTooltip[sliderLevel].length - 1].format(sliderDateFormats[sliderLevel])).tooltip().tooltip('hide').tooltip('fixTitle');
    // Looks like bootstrap has some problems with showing the tooltips at this point, so we show them with a small delay
    setTimeout(function(){
        if (sliderDates[sliderLevel][0].length > 1) {
            $('.ui-slider-handle').tooltip('show');
        } else {
            $('.ui-slider-handle:last').tooltip('show');
        }
    }, 200);
}

function changeSliderLevel(level) {
    initSlider(level);
    updateIndivVotesLayer();
    updateIndivVotesLayerControls();
}

var clearFilters = overrideFunction(clearFilters, null, function() {
    filterProperty = null;
    var slider = $("#time-slider");
    if (slider != null && sliderDates[sliderLevel][0].length > 0) {
        $("#time-slider").slider('values', [0, sliderDates[sliderLevel][1].length - 1]);
        filterDates = [sliderDates[sliderLevel][0][0], sliderDates[sliderLevel][1][sliderDates[sliderLevel][1].length - 1]];
        $('.ui-slider-handle:first').attr('title', sliderDatesTooltip[sliderLevel][0].format(sliderDateFormats[sliderLevel])).tooltip().tooltip('hide').tooltip('fixTitle');
        $('.ui-slider-handle:last').attr('title', sliderDatesTooltip[sliderLevel][sliderDatesTooltip[sliderLevel].length - 1].format(sliderDateFormats[sliderLevel])).tooltip().tooltip('hide').tooltip('fixTitle');
    }
});

var processMainLayerData = overrideFunction(processMainLayerData, function(data) {
    processDataDates(data.features);
    initSlider(1);
    //$('#time-scale').val('1').change();
    return data;
});

var filterFeature = (function(){
    var originalFilterFeature = filterFeature;
    return function(feature, layer) {
        return (originalFilterFeature(feature, layer) && !(filterDates && (feature.properties.dateObject > filterDates[1] || feature.properties.dateObject < filterDates[0])));
    }
})();
