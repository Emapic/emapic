//
// Locator tools code
//

$('html body').append("<!-- sidebarLocator ----------------------------------------------------->\n" +
    "<div id='sidebarLocator'>\n" +
    "<div id='all_countries'></div>\n" +
    "<div id='voted_countries'></div>\n" +
    "<div id='closesidebarLocator'></div>\n" +
    "</div>\n" +
    "<div class='modal' id='geolocatecurrentfailed'>\n" +
      "<div class='modal-dialog'>\n" +
        "<div class='modal-content'>\n" +
          "<div class='modal-header'>\n" +
            "<h4 class='modal-title'>" + emapic.utils.getI18n('js_geoposerror_title', 'Error de geoposicionamiento') + "</h4>\n" +
          "</div>\n" +
          "<div class='modal-body'>\n" +
            "<p>" + emapic.utils.getI18n('js_geoposerror_body', 'Lamentablemente no hemos sido capaces de localizar tu posición de manera automática.') + "</p>\n" +
          "</div>\n" +
          "<div class='modal-footer'>\n" +
            "<button id='accept-btn' type='button' class='btn btn-primary' data-dismiss='modal'>" + emapic.utils.getI18n('js_accept', 'Aceptar') + "</button>\n" +
          "</div>\n" +
        "</div><!-- /.modal-content -->\n" +
      "</div><!-- /.modal-dialog -->\n" +
    "</div>");

var emapic = emapic || {};

(function(emapic) {

    var allCountries = $('#all_countries'),
        votedCountries = $('#voted_countries'),
        closesidebarLocator = $('#closesidebarLocator'),
        allCountriesSpinner = null,
        scrollbars = {},
        votedCountriesSpinner = null,
        sidebar,
        countriesProvincesData = {},
        provincesMunicipalitiesData = {},
        allCountriesBbox = [[null, null], [null, null]],
        locatorsButtonsHtml = "<a id='control-extent' title='" + emapic.utils.getI18n('js_see_all_answers', 'Zoom a todas las respuestas') + "' href='javascript:void(0)' onclick='emapic.modules.locators.controlViewTo(\"answers\");'><span class='glyphicon glyphicon-fullscreen'></span></a>\n" +
            "<a id='control-user' title='" + emapic.utils.getI18n('js_see_my_answer_position', 'Ver posición de mi respuesta') + "' href='javascript:void(0)' onclick='emapic.modules.locators.controlViewTo(\"user\");'><span class='glyphicon glyphicon-user'></span></a>\n" +
            "<a id='control-country' title='" + emapic.utils.getI18n('js_see_my_answer_country', 'Ver el país de mi respuesta') + "' href='javascript:void(0)' onclick='emapic.modules.locators.controlViewTo(\"country\");'><img src='/images/icon-espana.png' /></a>\n" +
            "<a id='control-country-filter' title='" + emapic.utils.getI18n('js_see_per_country', 'Ver por país') + "' href='javascript:void(0)' onclick='emapic.modules.locators.filterCountry();'><span class='glyphicon glyphicon-flag'></span></a>\n" +
            "<a id='control-world' title='" + emapic.utils.getI18n('js_see_whole_world', 'Ver todo el mundo') + "' href='javascript:void(0)' onclick='emapic.modules.locators.controlViewTo(\"world\");'><span class='glyphicon glyphicon-globe'></span></a>\n" +
            "<a id='control-user' title='" + emapic.utils.getI18n('js_see_my_current_position', 'Centrar en mi posición actual') + "' href='javascript:void(0)' onclick='emapic.modules.locators.controlViewTo(\"currentPos\");'><span class='glyphicon glyphicon-map-marker'></span></a>",
        closesidebarLocatorHtml = "<button type='button' onclick='emapic.modules.locators.closeSidebar();'><span class='glyphicon glyphicon-chevron-right'></span></button>",
        geolocationDependantBtns = ['control-user', 'control-country'],
        allCountriesHtml = "<div><h3>" + emapic.utils.getI18n('js_see_country', 'Ver país') + "</h3>\n" +
            "<div class='row'>\n" +
            "<div class='col-md-6'>\n" +
            "<div class='btn-group'>\n" +
            "<button type='button' class='btn btn-sm btn-success' onclick='emapic.modules.locators.showSidebarVotedCountries();'>" + emapic.utils.getI18n('js_most_voted', '+ votados') + "</button>\n" +
            "<button type='button' class='btn btn-sm btn-success active'>" + emapic.utils.getI18n('js_all', 'todos') + "</button>\n" +
            "</div>\n" +
            "</div>\n" +
            "<div class='col-md-6'>\n" +
            "<input type='text' id='country-search' class='form-control input-sm search-countries' oninput='emapic.modules.locators.searchCountries(\"all_countries\");'>\n" +
            "</div>\n" +
            "</div>\n" +
            "</div>\n" +
            "<div class='table-scroll'>\n" +
            "<table class='table table-responsive' id='countries-table-all'><tbody></tbody></table>\n" +
            "</div>\n",
        votedCountriesHtml = "<div><h3>" + emapic.utils.getI18n('js_see_country', 'Ver país') + "</h3>\n" +
            "<div class='row'>\n" +
            "<div class='col-md-6'>\n" +
            "<div class='btn-group'>\n" +
            "<button type='button' class='btn btn-sm btn-success active'>" + emapic.utils.getI18n('js_most_voted', '+ votados') + "</button>\n" +
            "<button type='button' class='btn btn-sm btn-success' onclick='emapic.modules.locators.showSidebarAllCountries();'>" + emapic.utils.getI18n('js_all', 'todos') + "</button>\n" +
            "</div>\n" +
            "</div>\n" +
            "<div class='col-md-6'>\n" +
            "<input type='text' id='country-search' class='form-control input-sm search-countries' oninput='emapic.modules.locators.searchCountries(\"voted_countries\");'>\n" +
            "</div>\n" +
            "</div>\n" +
            "</div>\n" +
            "<div class='table-scroll'>\n" +
            "<table class='table table-responsive text-center' id='countries-table'>\n" +
            "<thead></thead>\n" +
            "<tbody></tbody>\n" +
            "</table>\n" +
            "</div>\n";

    emapic.modules = emapic.modules || {};
    emapic.modules.locators = emapic.modules.locators || {};

    emapic.modules.locators.showMunicipalities = false;

    emapic.initializeMap = emapic.utils.overrideFunction(emapic.initializeMap, null, function() {
        sidebar = L.control.sidebar('sidebarLocator', {
            position: 'topright',
            autoPan: false,
            closeButton: false
        });
        emapic.map.on('sidebar-hide', function() {
            resetFixedTableHeader('#voted_countries table');
        });
        emapic.map.on('sidebar-shown', function() {
            setFixedTableHeader('#voted_countries table', scrollbars['voted_countries']);
            emapic.modules.locators.searchCountries('voted_countries');
        });
        emapic.map.addControl(sidebar);
    });

    emapic.addViewsControls = emapic.utils.overrideFunction(emapic.addViewsControls, null, function() {
        var locatorsControl = L.control({position: 'topleft'});
        locatorsControl.onAdd = function (map) {
            this._div = L.DomUtil.create('div', 'locators-control views-control leaflet-bar');
            this._div.innerHTML = locatorsButtonsHtml;
            return this._div;
        };
        locatorsControl.addTo(emapic.map);
        emapic.utils.handleCtrlBtnEvents('.locators-control a', locatorsControl);
        emapic.checkGeolocationDependantControls(geolocationDependantBtns);
        populateSidebar();
    });

    emapic.modules.locators.searchCountries = function(component) {
        search = $('#' + component + ' .search-countries').val().toLowerCase();
        var promise;
        if (search === null || search.trim().length === 0) {
            promise = $('#' + component + ' tbody tr.country').each(
                function() {
                    var countryCode = $(this).find('.stats-country-label').html(),
                        provincesShown = $(this).find('i.fa-caret-down').hasClass('fa-caret-up');
                    $(this).show();
                    if (countryCode !== '' && provincesShown) {
                        $('tr.province-' + countryCode).show();
                    }
                }
            ).promise();
        } else {
            terms = search.split(' ');
            promise = $('#' + component + ' tbody tr.country').each(
                function() {
                    var countryName = $(this).find('.country-name').html().toLowerCase(),
                        countryCode = $(this).find('.stats-country-label').html(),
                        provincesShown = $(this).find('i.fa-caret-down').hasClass('fa-caret-up'),
                        matches = true;
                    for (i = 0, len = terms.length; i < len; i++) {
                        if (countryName.indexOf(terms[i]) == -1) {
                            if (countryCode !== '' && provincesShown) {
                                $('tr.province-' + countryCode).hide();
                            }
                            $(this).hide();
                            return;
                        }
                    }
                    $(this).show();
                    if (countryCode !== '' && provincesShown) {
                        $('tr.province-' + countryCode).show();
                    }
                }
            ).promise();
        }
        promise.done(function() {
            if (scrollbars[component]) {
                scrollbars[component].update();
            }
        });
    };

    emapic.modules.locators.controlViewTo = function(view) {
        switch(view) {
            case 'user':
                emapic.centerView({pos: emapic.position, zoom:12});
                break;
            case 'country':
                if ( emapic.geoapi.userCountryCode ) {
                    emapic.centerViewCountryBounds(emapic.geoapi.userCountryCode);
                } else {
                    emapic.centerView({pos: emapic.position, zoom:5});
                }
                break;
            case 'world':
                emapic.centerView({world: true});
                break;
            case 'answers':
                emapic.centerView({answers: true});
                break;
            case 'currentPos':
                emapic.geoapi.getApiLocationPromise().done(function(position) {
                    emapic.centerView({pos: [ position.coords.latitude, position.coords.longitude], zoom: 15});
                }).fail(function() {
                    $('#geolocatecurrentfailed').modal('show');
                });
                break;
        }
    };

    emapic.modules.locators.filterCountry = function() {
        var sidebarWasOpen = $('#sidebarLocator').parent().hasClass('visible');
        emapic.sidebarPanelClose();
        if (!sidebarWasOpen) {
            sidebar.show();
        }
    };

    emapic.modules.locators.closeSidebar = function() {
        sidebar.hide();
    };

    emapic.sidebarPanelClose = emapic.utils.overrideFunction(emapic.sidebarPanelClose, null, emapic.modules.locators.closeSidebar);

    emapic.modules.locators.showSidebarAllCountries = function() {
        resetFixedTableHeader('#voted_countries table');
        votedCountries.hide();
        allCountries.show();
    };

    emapic.modules.locators.showSidebarVotedCountries = function() {
        allCountries.hide();
        votedCountries.show(0, function() {
            setFixedTableHeader('#voted_countries table', scrollbars['voted_countries']);
            emapic.modules.locators.searchCountries('voted_countries');
        });
    };

    function populateSidebar() {
        allCountries.html(allCountriesHtml);
        allCountriesSpinner = new Spinner().spin($('#all_countries tbody')[0]);
        votedCountries.html(votedCountriesHtml);
        scrollbars['voted_countries'] = new PerfectScrollbar('#voted_countries .table-scroll');
        votedCountriesSpinner = new Spinner().spin($('#voted_countries tbody')[0]);
        emapic.modules.locators.showSidebarVotedCountries();
        closesidebarLocator.html(closesidebarLocatorHtml);
        populateSidebarData();
    }

    function populateSidebarData() {
        populateSidebarDataAllCountries();
        populateSidebarDataVotedCountries();
    }

    function populateSidebarDataVotedCountries() {
        var promise = $.when(
            emapic.getAllCountriesDataBbox(),
            emapic.getVotedCountriesDataNoGeom(),
            emapic.getVotedProvincesDataBbox()
        );
        (emapic.modules.locators.showMunicipalities ? $.when(promise,
            emapic.getVotedMunicipalitiesDataBbox()) : promise).done(function() {
            votedCountriesSpinner.stop();
            var specificVotesHtml = '<tr>\n' +
                "<th colspan='3'><small>" + emapic.utils.getI18n('js_country_of_origin', 'País de origen') + "</small></th>\n",
                total = 0,
                totals = [],
                countriesHtml = "";
            if (emapic.legend && emapic.legend.color) {
                for (var i=0, len=emapic.legend.color.responses_array.length; i<len; i++) {
                    specificVotesHtml += "<th><small>" + emapic.utils.escapeHtml(emapic.legend.color.responses_array[i].value) + "</small></th>\n";
                }
            }
            specificVotesHtml += "<th><small>" + emapic.utils.getI18n('js_total_votes', 'Votos totales') + "</small></th></tr>";
            $('#voted_countries thead').html(specificVotesHtml);
            if (emapic.modules.locators.showMunicipalities && $.isEmptyObject(provincesMunicipalitiesData)) {
        		$.each(emapic.votedMunicipalitiesData, function(code, municipality) {
                    if (!(municipality.properties.province_adm_code in provincesMunicipalitiesData)) {
                        provincesMunicipalitiesData[municipality.properties.province_adm_code] = [];
                    }
                    provincesMunicipalitiesData[municipality.properties.province_adm_code].push(municipality);
                });
        		$.each(provincesMunicipalitiesData, function(code, municipalities) {
                    municipalities.sort(function(a, b) {
                        return (b.properties.total_responses !== a.properties.total_responses) ? b.properties.total_responses - a.properties.total_responses : a.properties.name - b.properties.name;
                    });
                });
            }
            if ($.isEmptyObject(countriesProvincesData)) {
        		$.each(emapic.votedProvincesData, function(code, province) {
                    if (!(province.properties.country_iso_code in countriesProvincesData)) {
                        countriesProvincesData[province.properties.country_iso_code] = [];
                    }
                    countriesProvincesData[province.properties.country_iso_code].push(province);
                });
        		$.each(countriesProvincesData, function(code, provinces) {
                    provinces.sort(function(a, b) {
                        return (b.properties.total_responses !== a.properties.total_responses) ? b.properties.total_responses - a.properties.total_responses : a.properties.name - b.properties.name;
                    });
                });
            }
    		$.each(emapic.votedCountriesData, function(i, stat) {
    			if (emapic.allCountriesData[stat.iso_code] !== undefined) {
    				var specificVotesHtml = '',
                        provincesShown = $('tr.country-' + stat.iso_code + ' i.fa-caret-down').hasClass('fa-caret-up');
                    if (emapic.legend && emapic.legend.color) {
                        var votes;
                        for (i=0, len=emapic.legend.color.responses_array.length; i<len; i++) {
                            votes = parseInt(stat[emapic.legend.color.question + '_' + emapic.legend.color.responses_array[i].id]);
                            if (typeof totals[i] == 'undefined') {
                                totals[i] = 0;
                            }
                            totals[i] += votes;
                            specificVotesHtml += "<td>" + votes + "</td>\n";
                        }
                    }
                    total += parseInt(stat.total_responses);
                    if (stat.iso_code in emapic.allCountriesData) {
                        if (allCountriesBbox[0][0] === null ||
                            allCountriesBbox[0][0] > emapic.allCountriesData[stat.iso_code].bbox[0][0]) {
                            allCountriesBbox[0][0] = emapic.allCountriesData[stat.iso_code].bbox[0][0];
                        }
                        if (allCountriesBbox[0][1] === null ||
                            allCountriesBbox[0][1] > emapic.allCountriesData[stat.iso_code].bbox[0][1]) {
                            allCountriesBbox[0][1] = emapic.allCountriesData[stat.iso_code].bbox[0][1];
                        }
                        if (allCountriesBbox[1][0] === null ||
                            allCountriesBbox[1][0] < emapic.allCountriesData[stat.iso_code].bbox[1][0]) {
                            allCountriesBbox[1][0] = emapic.allCountriesData[stat.iso_code].bbox[1][0];
                        }
                        if (allCountriesBbox[1][1] === null ||
                            allCountriesBbox[1][1] < emapic.allCountriesData[stat.iso_code].bbox[1][1]) {
                            allCountriesBbox[1][1] = emapic.allCountriesData[stat.iso_code].bbox[1][1];
                        }
                    }
                    countriesHtml += "<tr class='country country-" + stat.iso_code + "'>\n" +
                        "<td class='stats-country-label hidden'>" + stat.iso_code + "</td>\n" +
                        "<td class='show-provinces'><i class='fa fa-caret-down" +
                        (provincesShown ? ' fa-caret-up' : '') + "' aria-hidden='true'></i></td>\n" +
                        "<td class='country-flag'><div class='flag-container'><span title='" +
                        emapic.allCountriesData[stat.iso_code].properties.name + "' class='flag-icon flag-icon-" +
                        stat.iso_code + "'></div></span>" +
                        "</td>\n<td class='country-name'>" +
                        emapic.allCountriesData[stat.iso_code].properties.name + "</td>\n" +
                        specificVotesHtml + "<td>" +
                        stat.total_responses + "</td>\n</tr>";
                	$.each(countriesProvincesData[stat.iso_code], function(i, province) {
        				var specificVotesHtml = '',
                            hasMunicipalities = province.properties.adm_code in provincesMunicipalitiesData && provincesMunicipalitiesData[province.properties.adm_code].length > 0,
                            municipalitiesShown = $('tr.' + $.escapeSelector('province-' + province.properties.adm_code) + ' i.fa-caret-down').hasClass('fa-caret-up');
                        if (emapic.legend && emapic.legend.color) {
                            var votes;
                            for (i=0, len=emapic.legend.color.responses_array.length; i<len; i++) {
                                specificVotesHtml += "<td><small>" +
                                    parseInt(province.properties[emapic.legend.color.question +
                                    '_' + emapic.legend.color.responses_array[i].id]) + "</small></td>\n";
                            }
                        }
                        countriesHtml += "<tr class='province province-country-" + stat.iso_code +
                            " province-" + province.properties.adm_code + "' " +
                            (provincesShown ? '' : "style='display: none;'") + ">\n" +
                            "<td class='stats-province-label hidden'>" + province.properties.adm_code + "</td>\n" +
                            (hasMunicipalities ? "<td class='show-municipalities'><i class='fa fa-caret-down" +
                            (municipalitiesShown ? ' fa-caret-up' : '') + "' aria-hidden='true'></i></td>\n" +
                            "<td colspan='2' class='province-name'>" : "<td colspan='3' class='province-name'>") +
                            province.properties.name + "</td>\n" +
                            specificVotesHtml + "<td><small>" +
                            province.properties.total_responses + "</small></td>\n</tr>";
                    	$.each(provincesMunicipalitiesData[province.properties.adm_code], function(j, municipality) {
            				var specificVotesHtml = '';
                            if (emapic.legend && emapic.legend.color) {
                                var votes;
                                for (i=0, len=emapic.legend.color.responses_array.length; i<len; i++) {
                                    specificVotesHtml += "<td><small>" +
                                        parseInt(municipality.properties[emapic.legend.color.question +
                                        '_' + emapic.legend.color.responses_array[i].id]) + "</small></td>\n";
                                }
                            }
                            countriesHtml += "<tr class='municipality municipality-country-" + stat.iso_code +
                                " municipality-province-" + province.properties.adm_code +
                                " municipality-" + municipality.properties.adm_code + "' " +
                                (provincesShown && municipalitiesShown ? '' : "style='display: none;'") + ">\n" +
                                "<td class='stats-municipality-label hidden'>" + municipality.properties.adm_code + "</td>\n" +
                                "<td colspan='3' class='province-name'>" +
                                municipality.properties.name + "</td>\n" +
                                specificVotesHtml + "<td><small>" +
                                municipality.properties.total_responses + "</small></td>\n</tr>";
                        });
                    });
    			}
    		});
            var totalsHtml = "";
            if (emapic.legend && emapic.legend.color) {
                for (var j=0, leng=emapic.legend.color.responses_array.length; j<leng; j++) {
                    totalsHtml += "<td><small>" + (j in totals ? totals[j] : 0) + "</small></td>\n";
                }
            }
            var votedProvincesNr = Object.keys(emapic.votedProvincesData).length;
            $('#voted_countries tbody').html("<tr class='stats-country-totals'>\n" +
                "<td class='stats-country-label hidden'></td>\n" +
                "<td colspan='3'><div>" + emapic.votedCountriesData.length +
                " " + (emapic.votedCountriesData.length == 1 ?
                emapic.utils.getI18n('js_totals_country', 'país') :
                emapic.utils.getI18n('js_totals_countries', 'países')) +
                "</div><div class='province-count'>" + votedProvincesNr + " " +
                (votedProvincesNr == 1 ?
                emapic.utils.getI18n('js_totals_region', 'región') :
                emapic.utils.getI18n('js_totals_regions', 'regiones')) + "</div></td>\n" +
                totalsHtml + "<td><small>" + total + "</small></td>\n</tr>");

            $('#voted_countries tbody').append(countriesHtml);

            $('#voted_countries tbody tr.country td:not(.show-provinces)').on("click", function() {
                var countryCode = $(this).parent().find('.stats-country-label').html();
                if (countryCode !== '') {
                    emapic.centerViewCountryBounds(countryCode);
                } else {
                    emapic.map.fitBounds(allCountriesBbox);
                }
            });

            $('#voted_countries tbody tr.country td.show-provinces').on("click", function() {
                var $this = $(this),
                    countryCode = $this.parent().find('.stats-country-label').html();
                if (countryCode !== '') {
                    $this.find('.fa.fa-caret-down').toggleClass('fa-caret-up');
                    $('tr.province-country-' + countryCode + ' td.show-municipalities .fa-caret-up').each(function() {
                        var provinceCode = $(this).closest('.province').find('.stats-province-label').html();
                        $('tr.municipality-province-' + provinceCode).toggle();
                    });
                    $('tr.province-country-' + countryCode).toggle();
                    if (scrollbars['voted_countries']) {
                        scrollbars['voted_countries'].update();
                    }
                }
            });

            $('#voted_countries tbody tr.province td:not(.show-municipalities)').on("click", function() {
                var provinceCode = $(this).parent().find('.stats-province-label').html();
                if (provinceCode !== '') {
                    emapic.map.fitBounds(emapic.votedProvincesData[provinceCode].bbox);
                }
            });

            $('#voted_countries tbody tr.province td.show-municipalities').on("click", function() {
                var $this = $(this),
                    provinceCode = $this.parent().find('.stats-province-label').html();
                if (provinceCode !== '') {
                    $this.find('.fa.fa-caret-down').toggleClass('fa-caret-up');
                    $('tr.municipality-province-' + provinceCode).toggle();
                    if (scrollbars['voted_countries']) {
                        scrollbars['voted_countries'].update();
                    }
                }
            });

            $('#voted_countries tbody tr.municipality').on("click", function() {
                var municipalityCode = $(this).find('.stats-municipality-label').html();
                if (municipalityCode !== '') {
                    emapic.map.fitBounds(emapic.votedMunicipalitiesData[municipalityCode].bbox);
                }
            });

            if ($('#voted_countries table').is(':visible')) {
                resetFixedTableHeader('#voted_countries table');
                setFixedTableHeader('#voted_countries table', scrollbars['voted_countries']);
                emapic.modules.locators.searchCountries('voted_countries');
            }
        });
    }

    function populateSidebarDataAllCountries() {
        emapic.getAllCountriesDataBbox().done(function() {
            allCountriesSpinner.stop();
            $.each(emapic.allCountriesData, function(code, country) {
                $('#all_countries tbody').append("<tr class='country country-" + code +"'>\n" +
                    "<td class='country-flag'><div class='flag-container'><span class='flag-icon flag-icon-" + code + "'></span></div></td>\n" +
                    "<td class='country-name'>" + emapic.allCountriesData[code].properties.name + "</td>\n" +
                    "<td><span class='label label-default pull-left'>" + code + "</span></td>\n" +
                    "</tr>");
            });
            scrollbars['all_countries'] = new PerfectScrollbar('#all_countries .table-scroll');
            $('#all_countries tbody tr').on("click", function() {
                var countryCode = $(this).find('.label').html();
                emapic.centerViewCountryBounds(countryCode);
            });
        });
    }

    function setFixedTableHeader(selector, scrollbar) {
        // If the table data has been already loaded and it's
        // visible, then we set its fixed header
        if ($(selector + ':visible td').length > 0) {
            var $table = $(selector);
            $table.closest('.table-scroll').scrollTop(0);
            $table.floatThead({
                scrollContainer: function($table){
                    return $table.closest('.table-scroll');
                }
            });
            if (scrollbar) {
                scrollbar.update();
            }
        }
    }

    function resetFixedTableHeader(selector) {
        // If the table data has been already loaded and it's
        // visible, then we reset its fixed header
        if ($(selector + ':visible td').length > 0) {
            var $table = $(selector);
            $table.closest('.table-scroll').scrollTop(0);
            $table.floatThead('destroy');
        }
    }

    emapic.updateIndivVotesLayerControls = emapic.utils.overrideFunction(emapic.updateIndivVotesLayerControls, null, populateSidebarDataVotedCountries);

})(emapic);
