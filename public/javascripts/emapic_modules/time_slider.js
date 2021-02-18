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
        filterDates,
        timeSliderHtml = "<div id='time-control'><div class='select dropup' id='time-scale'>\n" +
            "<button type='button' class='btn btn-default dropdown-toggle' data-toggle='dropdown' aria-expanded='false'>\n" +
            "<span id='1' class='selected' style='float: left;'>" + emapic.utils.getI18n('js_week', 'Semana') + "</span> <span class='caret'></span>\n" +
            "</button>\n" +
            "<ul class='dropdown-menu option' role='menu'>\n" +
            "<li id='0' onclick='emapic.modules.timeSlider.selectScale(0);return false;'><a href='#'>" + emapic.utils.getI18n('js_day', 'Día') + "</a></li>\n" +
            "<li id='1' onclick='emapic.modules.timeSlider.selectScale(1);return false;'><a href='#'>" + emapic.utils.getI18n('js_week', 'Semana') + "</a></li>\n" +
            "<li id='2' onclick='emapic.modules.timeSlider.selectScale(2);return false;'><a href='#'>" + emapic.utils.getI18n('js_month', 'Mes') + "</a></li>\n" +
            "<li id='3' onclick='emapic.modules.timeSlider.selectScale(3);return false;'><a href='#'>" + emapic.utils.getI18n('js_year', 'Año') + "</a></li>\n" +
            "</ul>\n" +
            "</div><div id='time-slider'></div></div>",
        timeFilterModalHtml = '<!-- Time Filter Modal -------->' +
            '<div class="modal" id="time-filter-modal" role="dialog">' +
            '<div class="modal-dialog">' +
            '<div class="modal-content">' +
            '<div class="modal-header">' +
            '<button type="button" class="close" data-dismiss="modal" aria-hidden="true"><span aria-hidden="true">&times;</span><span class="sr-only">' + emapic.utils.getI18n('js_close', 'Cerrar') + '</span></button>' +
            '<h3 class="modal-title">' + emapic.utils.getI18n('js_time_filter_title', 'Filtrar respuestas por su fecha') + '</h3>' +
            '</div>' +
            '<div class="modal-body">' +
            '<div class="form-group form-group-sm text-center">' +
            '<label>' + emapic.utils.getI18n('js_time_filter_scale', 'Escala') + ':</label>' +
            '<select name="time_scale" onchange="emapic.modules.timeSlider.scaleSelectChanged()">' +
            '<option value="0">' + emapic.utils.getI18n('js_day', 'Día') + '</option>' +
            '<option value="1" selected>' + emapic.utils.getI18n('js_week', 'Semana') + '</option>' +
            '<option value="2">' + emapic.utils.getI18n('js_month', 'Mes') + '</option>' +
            '<option value="3">' + emapic.utils.getI18n('js_year', 'Año') + '</option>' +
            '</select>' +
            '</div>' +
            '<hr>' +
            '<div class="form-group form-group-sm text-center">' +
            '<label>' + emapic.utils.getI18n('js_time_filter_from', 'Desde') + ':</label>' +
            '<select name="time_start" onchange="emapic.modules.timeSlider.fillMaxSelect()">' +
            '</select>' +
            '</div>' +
            '<div class="form-group form-group-sm text-center">' +
            '<label>' + emapic.utils.getI18n('js_time_filter_to', 'Hasta') + ':</label>' +
            '<select name="time_end" onchange="emapic.modules.timeSlider.fillMinSelect()">' +
            '</select>' +
            '</div>' +
            '</div>' +
            '<div class="modal-footer">' +
            '<a class="btn btn-danger" type="button" onclick="$(\'#time-filter-modal\').modal(\'hide\');">' + emapic.utils.getI18n('js_cancel', 'Cancelar') + '</a>' +
            '<a class="btn btn-primary" type="button" onclick="emapic.modules.timeSlider.applySelectsFilter();$(\'#time-filter-modal\').modal(\'hide\');">' + emapic.utils.getI18n('js_accept', 'Aceptar') + '</a>' +
            '</div>' +
            '</div>' +
            '</div>' +
            '</div>' +
            '<!-- End Time Filter Modal -------->';

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
                $('.ui-slider-handle:first').attr('title', sliderDatesTooltip[sliderLevel][0].format(sliderDateFormats[sliderLevel], emapic.locale)).tooltip().tooltip('hide').tooltip('fixTitle');
                $('.ui-slider-handle:last').attr('title', sliderDatesTooltip[sliderLevel][sliderDatesTooltip[sliderLevel].length - 1].format(sliderDateFormats[sliderLevel], emapic.locale)).tooltip().tooltip('hide').tooltip('fixTitle');
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
        $('body').append(timeFilterModalHtml);

        var timeSliderControl = L.control({position: 'bottomleft'});
        timeSliderControl.onAdd = function (map) {
            this._div = L.DomUtil.create('div', 'time-control hide-small leaflet-bar no-shadow');
            this._div.innerHTML = timeSliderHtml;
            return this._div;
        };
        timeSliderControl.addTo(emapic.map);

        var timeBtnControl = L.control({position: 'bottomright'});
        timeBtnControl.onAdd = function (map) {
            this._div = L.DomUtil.create('div', 'leaflet-bar show-small');
            this._div.innerHTML = "<a id='control-time-filter' data-placement='left' title='" + emapic.utils.getI18n('js_time_filter_title', 'Filtrar respuestas por su fecha') +
                "' href='javascript:void(0)' onclick='emapic.modules.timeSlider.fillSelects();$(\"#time-filter-modal\").modal(\"show\");'><span class='glyphicon glyphicon-calendar'></span></a>";
            return this._div;
        };
        timeBtnControl.addTo(emapic.map);
    });

    emapic.modules.timeSlider.selectScale = function(id) {
        var $el = $('#time-control li#' + id),
            v = $el.children().text();
        $('#time-control .selected').attr('id', id);
        $('#time-control .selected').text(v);
        changeSliderLevel(id);
    };

    emapic.modules.timeSlider.filterChanged = function() {
        emapic.filtersUpdated();
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
        var dateTooltip = sliderDatesTooltip[sliderLevel][ui.value].format(sliderDateFormats[sliderLevel], emapic.locale);
        $(ui.handle).find('.tooltip-inner').html(dateTooltip);
        $(ui.handle).attr('data-original-title', dateTooltip);
        if (event.originalEvent) {
            var startDateNr = ui.values[0],
                startDate = sliderDates[sliderLevel][0][startDateNr],
                endDateNr = ui.values[1],
                endDate = sliderDates[sliderLevel][1][ui.values[1]];
            filterDates = [startDate, endDate];
            emapic.modules.timeSlider.filterChanged();
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

    function fromUTC(date) {
        return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(),
            date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds(), date.getUTCMilliseconds());
    }

    function initDateStructures(level) {
        // We check if we have already stored the dates for the current level
        if (minDate !== null && typeof sliderDates[level] === 'undefined') {
            // Arrays will contain min and max dates
            sliderDates[level] = [[],[]];
            sliderDatesTooltip[level] = [];
            if (level == 3) { // Year
                // For the min date we set January 1st 00:00:00
                d = new Date(Date.UTC(minDate.getUTCFullYear(), 0, 1, 0, 0, 0, 0));
                while (d < maxDate) {
                    aux = new Date(d);
                    sliderDates[level][0].push(aux);
                    d.setUTCFullYear(d.getUTCFullYear() + 1);
                }

                // For the max date we set December 31st 23:59:59
                d = new Date(Date.UTC(minDate.getUTCFullYear() - 1, 11, 31, 23, 59, 59, 999));
                do {
                    d.setUTCFullYear(d.getUTCFullYear() + 1);
                    aux = new Date(d);
                    sliderDates[level][1].push(aux);
                    // We also store the tooltip date
                    sliderDatesTooltip[level].push(fromUTC(aux));
                } while (d < maxDate);
            } else if (level == 2) { // Month
                // For the min date we set month's 1st 00:00:00
                d = new Date(Date.UTC(minDate.getUTCFullYear(), minDate.getUTCMonth(), 1, 0, 0, 0, 0));
                while (d <= maxDate) {
                    aux = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0,0));
                    sliderDates[level][0].push(aux);
                    d.setUTCMonth(d.getUTCMonth() + 1);
                }

                // For the max date we set month's last day 23:59:59
                // which we'll obtain by sustracting one day from the next
                // month's 1st
                d = new Date(Date.UTC(minDate.getUTCFullYear(), minDate.getUTCMonth(), 1, 0, 0, 0, 0));
                do {
                    d.setUTCMonth(d.getUTCMonth() + 1);
                    aux = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - 1, 23, 59, 59, 999));
                    sliderDates[level][1].push(aux);
                    // We also store the tooltip date
                    sliderDatesTooltip[level].push(fromUTC(aux));
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
                    sliderDates[level][0].push(aux);
                    d.setUTCDate(d.getUTCDate() + 7);
                    // We also store the tooltip date (week's monday)
                    sliderDatesTooltip[level].push(fromUTC(aux));
                }

                // For the max date we set week's sunday 23:59:59
                d = new Date(Date.UTC(minDate.getUTCFullYear(), minDate.getUTCMonth(), minDate.getUTCDate() - 7, 23, 59, 59, 999));
                if (d.getUTCDay() !== 0) {
                    d.setUTCDate(d.getUTCDate() + 7 - d.getUTCDay());
                }
                do {
                    d.setUTCDate(d.getUTCDate() + 7);
                    aux = new Date(d);
                    sliderDates[level][1].push(aux);
                } while (d < maxDate);
            } else { // Day
                // For the min date we set day at 00:00:00
                d = new Date(Date.UTC(minDate.getUTCFullYear(), minDate.getUTCMonth(), minDate.getUTCDate(), 0, 0, 0, 0));
                while (d < maxDate) {
                    aux = new Date(d);
                    sliderDates[level][0].push(aux);
                    d.setUTCDate(d.getUTCDate() + 1);
                }

                // For the max date we set day at 23:59:59
                d = new Date(Date.UTC(minDate.getUTCFullYear(), minDate.getUTCMonth(), minDate.getUTCDate() - 1, 23, 59, 59, 999));
                do {
                    d.setUTCDate(d.getUTCDate() + 1);
                    aux = new Date(d);
                    sliderDates[level][1].push(aux);
                    // We also store the tooltip date
                    sliderDatesTooltip[level].push(fromUTC(aux));
                } while (d < maxDate);
            }
        }
    }

    emapic.modules.timeSlider.applySelectsFilter = function() {
        var scale = parseInt($('#time-filter-modal select[name="time_scale"]').val()),
            minSelectDateNr = parseInt($('#time-filter-modal select[name="time_start"]').val()),
            maxSelectDateNr = parseInt($('#time-filter-modal select[name="time_end"]').val());
        if (scale !== sliderLevel) {
            emapic.modules.timeSlider.selectScale(scale);
        }
        $('#time-slider').slider('values', [minSelectDateNr, maxSelectDateNr]);
        filterDates = [sliderDates[sliderLevel][0][minSelectDateNr], sliderDates[sliderLevel][1][maxSelectDateNr]];
        emapic.modules.timeSlider.filterChanged();
    }

    emapic.modules.timeSlider.scaleSelectChanged = function() {
        $('#time-filter-modal select[name="time_start"]').val(null);
        $('#time-filter-modal select[name="time_end"]').val(null);
        initDateStructures($('#time-filter-modal select[name="time_scale"]').val());
        emapic.modules.timeSlider.fillMinSelect();
        emapic.modules.timeSlider.fillMaxSelect();
    };

    emapic.modules.timeSlider.fillSelects = function() {
        $('#time-filter-modal select[name="time_scale"]').val(sliderLevel);
        emapic.modules.timeSlider.fillMinSelect();
        $('#time-filter-modal select[name="time_start"]').val(sliderDates[sliderLevel][0].indexOf(filterDates[0]));
        emapic.modules.timeSlider.fillMaxSelect();
        $('#time-filter-modal select[name="time_end"]').val(sliderDates[sliderLevel][1].indexOf(filterDates[1]));
        emapic.modules.timeSlider.fillMinSelect();
    };

    emapic.modules.timeSlider.fillMinSelect = function() {
        var scale = $('#time-filter-modal select[name="time_scale"]').val(),
            $minSelectDate = $('#time-filter-modal select[name="time_start"]'),
            $maxSelectDate = $('#time-filter-modal select[name="time_end"]'),
            minSelectDateNr = $minSelectDate.val(),
            maxSelectDateNr = $maxSelectDate.val(),
            minSelectDateHtml = '';
        for (var i = 0, iLen = sliderDatesTooltip[scale].length; i<iLen; i++) {
            var html = '<option value="' + i + '">' + sliderDatesTooltip[scale][i].format(sliderDateFormats[scale], emapic.locale) + '</option>';
            if (maxSelectDateNr === null || i <= maxSelectDateNr) {
                minSelectDateHtml += html;
            }
        }
        $minSelectDate.html(minSelectDateHtml);
        if (minSelectDateNr !== null) {
            $minSelectDate.val(minSelectDateNr);
        }
    };

    emapic.modules.timeSlider.fillMaxSelect = function() {
        var scale = $('#time-filter-modal select[name="time_scale"]').val(),
            $minSelectDate = $('#time-filter-modal select[name="time_start"]'),
            $maxSelectDate = $('#time-filter-modal select[name="time_end"]'),
            minSelectDateNr = $minSelectDate.val(),
            maxSelectDateNr = $maxSelectDate.val(),
            maxSelectDateHtml = '';
        for (var i = 0, iLen = sliderDatesTooltip[scale].length; i<iLen; i++) {
            var html = '<option value="' + i + '">' + sliderDatesTooltip[scale][i].format(sliderDateFormats[scale], emapic.locale) + '</option>';
            if (minSelectDateNr === null || i >= minSelectDateNr) {
                maxSelectDateHtml = html + maxSelectDateHtml;
            }
        }
        $maxSelectDate.html(maxSelectDateHtml);
        if (maxSelectDateNr !== null) {
            $maxSelectDate.val(maxSelectDateNr);
        }
    };

    function initSlider() {
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
        $("#time-slider").slider({
            range: true,
            min: 0,
            max: sliderDates[sliderLevel][1].length == 1 ? -1 : sliderDates[sliderLevel][1].length - 1,
            values: [0, sliderDates[sliderLevel][1].length - 1],
            slide: sliderFilter,
            change: sliderFilter,
            stop: function(event, ui) {
                $(ui.handle).attr('data-original-title', sliderDatesTooltip[sliderLevel][ui.value].format(sliderDateFormats[sliderLevel], emapic.locale))
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
        if ($("#time-slider") !== null && typeof sliderDates[sliderLevel] !== 'undefined' &&
            sliderDates[sliderLevel][0].length > 0) {
            $('#time-slider .ui-slider-handle:first').attr('title', sliderDatesTooltip[sliderLevel][0].format(sliderDateFormats[sliderLevel], emapic.locale))
                .tooltip({ container: '#time-slider .ui-slider-handle:first'}).tooltip('hide').tooltip('fixTitle').on('shown.bs.tooltip', function() {
                    disableTooltipEvents($('#time-slider .ui-slider-handle:first .tooltip')[0]);
                });
            $('#time-slider .ui-slider-handle:last').attr('title', sliderDatesTooltip[sliderLevel][sliderDatesTooltip[sliderLevel].length - 1].format(sliderDateFormats[sliderLevel], emapic.locale))
                .tooltip({ container: '#time-slider .ui-slider-handle:last'}).tooltip('hide').tooltip('fixTitle').on('shown.bs.tooltip', function() {
                    disableTooltipEvents($('#time-slider .ui-slider-handle:last .tooltip')[0]);
                });
        }
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
        initDateStructures(level);
        sliderLevel = level;
        initSlider();
        emapic.modules.timeSlider.filterChanged();
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
        initDateStructures(1);
        sliderLevel = 1;
        initSlider();
        //$('#time-scale').val('1').change();
        return data;
    });

})(emapic);
