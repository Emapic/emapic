//
// Time slider code
//

var emapic = emapic || {};

(function(emapic) {

    var minDate = null,
        maxDate = null,
        sliderDates = [],
        sliderDatesTooltip = [],
        sliderLevel = null,
        sliderDateFormats = [emapic.utils.getI18n('js_full_date_format', 'j/n/Y'), emapic.utils.getI18n('js_week_format', '\\S\\e\\m\\a\\n\\a W (\\d\\e\\l j/n/Y)'), 'F Y', 'Y'],
        filterDates;

    emapic.modules = emapic.modules || {};
    emapic.modules.timeSlider = emapic.modules.timeSlider || {};

    emapic.modules.timeSlider.filter = new emapic.Filter({
        applyFilter: function(feature) {
            return !(filterDates && (feature.properties.dateObject > filterDates[1] || feature.properties.dateObject < filterDates[0]));
        },
        clearFilter: function() {
            var slider = $("#time-slider");
            if ($("#time-slider") !== null && typeof sliderDates[sliderLevel] !== 'undefined' &&
                sliderDates[sliderLevel][0].length > 0) {
                slider.slider('values', [0, sliderDates[sliderLevel][1].length - 1]);
                filterDates = [sliderDates[sliderLevel][0][0], sliderDates[sliderLevel][1][sliderDates[sliderLevel][1].length - 1]];
                $('.ui-slider-handle:first').attr('title', sliderDatesTooltip[sliderLevel][0].format(sliderDateFormats[sliderLevel])).tooltip().tooltip('hide').tooltip('fixTitle');
                $('.ui-slider-handle:last').attr('title', sliderDatesTooltip[sliderLevel][sliderDatesTooltip[sliderLevel].length - 1].format(sliderDateFormats[sliderLevel])).tooltip().tooltip('hide').tooltip('fixTitle');
            }
        },
        isFilterActive: function() {
            return (filterDates && sliderLevel !== null && (filterDates[0] !== sliderDates[sliderLevel][0][0] || filterDates[1] !== sliderDates[sliderLevel][1][sliderDates[sliderLevel][1].length - 1]));
        },
        getBriefDescription: function() {
            return emapic.utils.getI18n('js_time_filter_brief_description', 'Filtro por fechas');
        },
        getExportParameters: function() {
            var params = [];
            if (filterDates && sliderLevel !== null) {
                if (filterDates[0] !== sliderDates[sliderLevel][0][0]) {
                    params.push('filter_tmin=' + encodeURIComponent(filterDates[0].getTime()));
                }
                if (filterDates[1] !== sliderDates[sliderLevel][1][sliderDates[sliderLevel][1].length - 1]) {
                    params.push('filter_tmax=' + encodeURIComponent(filterDates[1].getTime()));
                }
            }
            return params;
        }
    });

    emapic.addFilter(emapic.modules.timeSlider.filter);

    emapic.addViewsControls = emapic.utils.overrideFunction(emapic.addViewsControls, null, function() {
        var timeControl = L.control({position: 'bottomleft'});
        timeControl.onAdd = function (map) {
            this._div = L.DomUtil.create('div', 'time-control hide-small leaflet-bar no-shadow');
            this._div.innerHTML = "<div id='time-control'><div class='select dropup' id='time-scale'>\n" +
                "<button type='button' class='btn btn-default dropdown-toggle' data-toggle='dropdown' aria-expanded='false'>\n" +
                "<span id='1' class='selected' style='float: left;'>" + emapic.utils.getI18n('js_week', 'Semana') + "</span> <span class='caret'></span>\n" +
                "</button>\n" +
                "<ul class='dropdown-menu option' role='menu'>\n" +
                "<li id='0' onclick='emapic.modules.timeSlider.selectScale(this);return false;'><a href='#'>" + emapic.utils.getI18n('js_day', 'Día') + "</a></li>\n" +
                "<li id='1' onclick='emapic.modules.timeSlider.selectScale(this);return false;'><a href='#'>" + emapic.utils.getI18n('js_week', 'Semana') + "</a></li>\n" +
                "<li id='2' onclick='emapic.modules.timeSlider.selectScale(this);return false;'><a href='#'>" + emapic.utils.getI18n('js_month', 'Mes') + "</a></li>\n" +
                "<li id='3' onclick='emapic.modules.timeSlider.selectScale(this);return false;'><a href='#'>" + emapic.utils.getI18n('js_year', 'Año') + "</a></li>\n" +
                "</ul>\n" +
                "</div><div id='time-slider'></div></div>";
            return this._div;
        };
        timeControl.addTo(emapic.map);
    });

    emapic.modules.timeSlider.selectScale = function(el) {
        var i = $(el).parents('.select').attr('id');
        var v = $(el).children().text();
        var o = $(el).attr('id');
        $('#'+i+' .selected').attr('id',o);
        $('#'+i+' .selected').text(v);
        changeSliderLevel(parseInt(o));
    };

    emapic.disableIndivLayerExclusiveComponents = emapic.utils.overrideFunction(emapic.disableIndivLayerExclusiveComponents, null, function() {
        // If there are no min/max dates, then we have no data to traverse
        if (!minDate) {
            return;
        }
        $('#time-scale button').prop('disabled', true);
        $('#time-slider').slider('disable');
    });

    emapic.enableIndivLayerExclusiveComponents = emapic.utils.overrideFunction(emapic.enableIndivLayerExclusiveComponents, null, function() {
        // If there are no min/max dates, then we have no data to traverse
        if (!minDate) {
            return;
        }
        $('#time-scale button').prop('disabled', false);
        $('#time-slider').slider('enable');
    });

    function sliderFilter(event, ui) {
        $(ui.handle).find('.tooltip-inner').html(sliderDatesTooltip[sliderLevel][ui.value].format(sliderDateFormats[sliderLevel]));
        if (event.originalEvent) {
            var startDate = sliderDates[sliderLevel][0][ui.values[0]],
                endDate = sliderDates[sliderLevel][1][ui.values[1]];
            filterDates = [startDate, endDate];
            emapic.filtersUpdated();
        }
    }

    function processDataDates(data) {
        for (i=0, len=data.length; i < len; i++) {
            if (data[i].properties.timestamp !== null) {
                dateObject = new Date(parseInt(data[i].properties.timestamp));
                data[i].properties.dateObject = dateObject;
                if (minDate === null || dateObject < minDate) {
                    minDate = dateObject;
                }
                if (maxDate === null || dateObject > maxDate) {
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
                d = new Date(Date.UTC(minDate.getUTCFullYear(), 0, 1, 0, 0, 0, 0));
                while (d < maxDate) {
                    aux = new Date(d);
                    sliderDates[sliderLevel][0].push(aux);
                    d.setUTCFullYear(d.getUTCFullYear() + 1);
                }

                // For the max date we set December 31st 23:59:59
                d = new Date(Date.UTC(minDate.getUTCFullYear() - 1, 11, 31, 23, 59, 59, 999));
                do {
                    d.setUTCFullYear(d.getUTCFullYear() + 1);
                    aux = new Date(d);
                    sliderDates[sliderLevel][1].push(aux);
                    // We also store the tooltip date
                    sliderDatesTooltip[sliderLevel].push(aux);
                } while (d < maxDate);
            } else if (level == 2) { // Month
                // For the min date we set month's 1st 00:00:00
                d = new Date(Date.UTC(minDate.getUTCFullYear(), minDate.getUTCMonth(), 1, 0, 0, 0, 0));
                while (d <= maxDate) {
                    aux = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0,0));
                    sliderDates[sliderLevel][0].push(aux);
                    d.setUTCMonth(d.getUTCMonth() + 1);
                }

                // For the max date we set month's last day 23:59:59
                // which we'll obtain by sustracting one day from the next
                // month's 1st
                d = new Date(Date.UTC(minDate.getUTCFullYear(), minDate.getUTCMonth(), 1, 0, 0, 0, 0));
                do {
                    d.setUTCMonth(d.getUTCMonth() + 1);
                    aux = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - 1, 23, 59, 59, 999));
                    sliderDates[sliderLevel][1].push(aux);
                    // We also store the tooltip date
                    sliderDatesTooltip[sliderLevel].push(aux);
                } while (d <= maxDate);
            } else if (level == 1) { // Week
                // For the min date we set week's monday 00:00:00
                d = new Date(Date.UTC(minDate.getUTCFullYear(), minDate.getUTCMonth(), minDate.getUTCDate(), 0, 0, 0, 0));
                if (d.getUTCDay() === 0) {
                    d.setUTCDate(d.getUTCDate() - 6);
                } else {
                    d.setUTCDate(d.getUTCDate() + 1 - d.getUTCDay());
                }
                while (d < maxDate) {
                    aux = new Date(d);
                    sliderDates[sliderLevel][0].push(aux);
                    d.setUTCDate(d.getUTCDate() + 7);
                    // We also store the tooltip date (week's monday)
                    sliderDatesTooltip[sliderLevel].push(aux);
                }

                // For the max date we set week's sunday 23:59:59
                d = new Date(Date.UTC(minDate.getUTCFullYear(), minDate.getUTCMonth(), minDate.getUTCDate() - 7, 23, 59, 59, 999));
                if (d.getUTCDay() !== 0) {
                    d.setUTCDate(d.getUTCDate() + 7 - d.getUTCDay());
                }
                do {
                    d.setUTCDate(d.getUTCDate() + 7);
                    aux = new Date(d);
                    sliderDates[sliderLevel][1].push(aux);
                } while (d < maxDate);
            } else { // Day
                // For the min date we set day at 00:00:00
                d = new Date(Date.UTC(minDate.getUTCFullYear(), minDate.getUTCMonth(), minDate.getUTCDate(), 0, 0, 0, 0));
                while (d < maxDate) {
                    aux = new Date(d);
                    sliderDates[sliderLevel][0].push(aux);
                    d.setUTCDate(d.getUTCDate() + 1);
                }

                // For the max date we set day at 23:59:59
                d = new Date(Date.UTC(minDate.getUTCFullYear(), minDate.getUTCMonth(), minDate.getUTCDate() - 1, 23, 59, 59, 999));
                do {
                    d.setUTCDate(d.getUTCDate() + 1);
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
            stop: function(event, ui) {
                $(ui.handle).attr('data-original-title', sliderDatesTooltip[sliderLevel][ui.value].format(sliderDateFormats[sliderLevel]))
                    .tooltip('fixTitle');
            },
            start: function(event, ui) {
                event.stopPropagation();
            }
        });
        $('#time-slider').bind('touchmove', function(e) {
            e.stopPropagation();
        });
        L.DomEvent.disableClickPropagation($('#time-control')[0]);
        filterDates = [sliderDates[sliderLevel][0][0], sliderDates[sliderLevel][1][sliderDates[sliderLevel][1].length - 1]];
        $('#time-slider .ui-slider-handle:first').attr('title', sliderDatesTooltip[sliderLevel][0].format(sliderDateFormats[sliderLevel]))
            .tooltip({ container: '#time-slider .ui-slider-handle:first'}).tooltip('hide').tooltip('fixTitle').on('shown.bs.tooltip', function() {
                disableTooltipEvents($('#time-slider .ui-slider-handle:first .tooltip')[0]);
            });
        $('#time-slider .ui-slider-handle:last').attr('title', sliderDatesTooltip[sliderLevel][sliderDatesTooltip[sliderLevel].length - 1].format(sliderDateFormats[sliderLevel]))
            .tooltip({ container: '#time-slider .ui-slider-handle:last'}).tooltip('hide').tooltip('fixTitle').on('shown.bs.tooltip', function() {
                disableTooltipEvents($('#time-slider .ui-slider-handle:last .tooltip')[0]);
            });
        // Looks like bootstrap has some problems with showing the tooltips at this point, so we show them with a small delay
        setTimeout(function(){
            if (sliderDates[sliderLevel][0].length > 1) {
                $('#time-slider .ui-slider-handle').tooltip('show');
            } else {
                $('#time-slider .ui-slider-handle:last').tooltip('show');
            }
        }, 200);
    }

    function changeSliderLevel(level) {
        initSlider(level);
        emapic.filtersUpdated();
    }

    function disableTooltipEvents(element) {
        var stop = L.DomEvent.stopPropagation;
        L.DomEvent
            .on(element, 'click', stop)
            .on(element, 'dblclick', stop)
            .on(element, 'focus', stop)
            .on(element, 'focusin', stop)
            .on(element, 'hover', stop)
            .on(element, 'mousedown', stop)
            .on(element, 'mouseover', stop)
            .disableClickPropagation(element)
            .disableScrollPropagation(element);
    }

    emapic.processMainLayerData = emapic.utils.overrideFunction(emapic.processMainLayerData, function(data) {
        processDataDates(data.features);
        initSlider(1);
        //$('#time-scale').val('1').change();
        return data;
    });

})(emapic);
