//
// Locator tools code
//

$('html body').append("<!-- SIDEBAR ----------------------------------------------------->\n" +
    "<div id='sidebar'>\n" +
    "<div id='all_countries'></div>\n" +
    "<div id='voted_countries'></div>\n" +
    "</div>");

var emapic = emapic || {};

(function(emapic) {

    var allCountries = $('#all_countries'),
        votedCountries = $('#voted_countries'),
        sidebar,
        allCountriesBbox = [[null, null], [null, null]],
        sidebarVotedCountriesData = null,
        locatorsButtonsHtml = "<a id='control-user' title='" + emapic.utils.getI18n('js_see_my_position', 'Ver mi posición') + "' href='javascript:void(0)' onclick='emapic.modules.locators.controlViewTo(\"user\");'><span class='glyphicon glyphicon-user'></span></a>\n" +
            "<a id='control-country' title='" + emapic.utils.getI18n('js_see_my_country', 'Ver mi país') + "' href='javascript:void(0)' onclick='emapic.modules.locators.controlViewTo(\"country\");'><img src='/images/icon-espana.png' /></a>\n" +
            "<a id='control-country-filter' title='" + emapic.utils.getI18n('js_see_per_country', 'Ver por país') + "' href='javascript:void(0)' onclick='emapic.modules.locators.filterCountry();'><span class='glyphicon glyphicon-flag'></span></a>\n" +
            "<a id='control-world' title='" + emapic.utils.getI18n('js_see_whole_world', 'Ver todo el mundo') + "' href='javascript:void(0)' onclick='emapic.modules.locators.controlViewTo(\"world\");'><span class='glyphicon glyphicon-globe'></span></a>",
        geolocationDependantBtns = ['control-user', 'control-country'],
        allCountriesHtml = "<h3>" + emapic.utils.getI18n('js_see_country', 'Ver país') + "</h3>\n" +
            "<div class='row'>\n" +
            "<div class='col-md-6'>\n" +
            "<div class='btn-group'>\n" +
            "<button type='button' class='btn btn-sm' onclick='emapic.modules.locators.showSidebarVotedCountries();'>" + emapic.utils.getI18n('js_most_voted', '+ votados') + "</button>\n" +
            "<button type='button' class='btn btn-sm active'>" + emapic.utils.getI18n('js_all', 'todos') + "</button>\n" +
            "</div>\n" +
            "</div>\n" +
            "<div class='col-md-6'>\n" +
            "<input type='text' id='country-search' class='form-control input-sm search-countries' oninput='emapic.modules.locators.searchCountries(\"all_countries\");'>\n" +
            "</div>\n" +
            "</div>\n" +
            "<table class='table table-responsive' id='countries-table-all'><tbody></tbody></table>\n",
        votedCountriesHtml = "<h3>" + emapic.utils.getI18n('js_see_country', 'Ver país') + "</h3>\n" +
            "<div class='row'>\n" +
            "<div class='col-md-6'>\n" +
            "<div class='btn-group'>\n" +
            "<button type='button' class='btn btn-sm active'>" + emapic.utils.getI18n('js_most_voted', '+ votados') + "</button>\n" +
            "<button type='button' class='btn btn-sm' onclick='emapic.modules.locators.showSidebarAllCountries();'>" + emapic.utils.getI18n('js_all', 'todos') + "</button>\n" +
            "</div>\n" +
            "</div>\n" +
            "<div class='col-md-6'>\n" +
            "<input type='text' id='country-search' class='form-control input-sm search-countries' oninput='emapic.modules.locators.searchCountries(\"voted_countries\");'>\n" +
            "</div>\n" +
            "</div>\n" +
            "<table class='table table-responsive text-center' id='countries-table'>\n" +
            "<thead>\n" +
            "<tr>\n" +
            "<td></td>\n" +
            "<td><small>" + emapic.utils.getI18n('js_country_of_origin', 'País de origen') + "</small></td>{{specificVotesHtml}}\n" +
            "<td><small>" + emapic.utils.getI18n('js_total_votes', 'Votos totales') + "</small></td>\n" +
            "</tr>\n" +
            "</thead>\n" +
            "<tbody></tbody>\n" +
            "</table>";

    emapic.modules = emapic.modules || {};
    emapic.modules.locators = emapic.modules.locators || {};

    emapic.modules.locators.getStatsCountriesJsonUrl = function() {
        return "/api/survey/" + emapic.surveyId + "/totals/countries/nogeom";
    };

    emapic.initializeMap = emapic.utils.overrideFunction(emapic.initializeMap, null, function() {
        sidebar = L.control.sidebar('sidebar', {
            position: 'right'
        });
        emapic.map.addControl(sidebar);
    });

    emapic.addViewsControls = emapic.utils.overrideFunction(emapic.addViewsControls, null, function() {
        var viewsControl = L.control({position: 'topleft'});
        viewsControl.onAdd = function (map) {
            this._div = L.DomUtil.create('div', 'views-control leaflet-bar');
            this._div.innerHTML = locatorsButtonsHtml;
            return this._div;
        };
        viewsControl.addTo(emapic.map);
        emapic.checkGeolocationDependantControls(geolocationDependantBtns);
        populateSidebar();
    });

    emapic.modules.locators.searchCountries = function(component) {
        search = $('#' + component + ' .search-countries').val().toLowerCase();
        if (search === null || search.trim().length === 0) {
        $('#' + component + ' tbody tr').each(
            function() {
                $(this).show();
            }
        );
        }
        terms = search.split(' ');
        $('#' + component + ' tbody tr').each(
            function() {
                var countryName = $(this).find('.country-name').html().toLowerCase();
                matches = true;
                for (i = 0, len = terms.length; i < len; i++) {
                    if (countryName.indexOf(terms[i]) == -1) {
                        $(this).hide();
                        matches = false;
                        break;
                    }
                }
                if (matches) {
                    $(this).show();
                }
            }
        );
    };

    emapic.modules.locators.controlViewTo = function(view) {
        if ( view == 'user' ) {
            emapic.centerView({pos: emapic.position, zoom:12});
        } else if ( view == 'country' ) {
            if ( emapic.geoapi.userCountryCode ) {
                emapic.centerViewCountryBounds(emapic.geoapi.userCountryCode);
            } else {
                emapic.centerView({pos: emapic.position, zoom:5});
            }
        } else if ( view == 'world' ) {
            emapic.centerView({world: true});
        }
    };

    emapic.modules.locators.filterCountry = function() {
        sidebar.toggle();
    };

    emapic.modules.locators.showSidebarAllCountries = function() {
        votedCountries.hide();
        allCountries.show();
    };

    emapic.modules.locators.showSidebarVotedCountries = function() {
        allCountries.hide();
        votedCountries.show();
    };

    function populateSidebar() {
        allCountries.html(allCountriesHtml);

        $.getJSON(emapic.modules.locators.getStatsCountriesJsonUrl(), populateSidebarData);
    }

    function populateSidebarData(stats) {
    	sidebarVotedCountriesData = stats;
        populateSidebarDataAllCountries();
        populateSidebarDataVotedCountries();
        if (sidebarVotedCountriesData &&
            sidebarVotedCountriesData.length > 0) {
            emapic.modules.locators.showSidebarVotedCountries();
        }
    }

    function populateSidebarDataVotedCountries() {
        if (sidebarVotedCountriesData) {
            var specificVotesHtml = '',
                total = 0,
                totals = [],
                countriesHtml = "";
            if (emapic.legend && emapic.legend.color) {
                for (var i=0, len=emapic.legend.color.responses_array.length; i<len; i++) {
                    specificVotesHtml += "<td><small>" + emapic.utils.escapeHtml(emapic.legend.color.responses_array[i].value) + "</small></td>\n";
                }
            }
            votedCountries.html(votedCountriesHtml.replace('{{specificVotesHtml}}', specificVotesHtml));
    		$.each(sidebarVotedCountriesData, function(i, stat) {
    			if (emapic.allCountriesData[stat.iso_code] !== undefined) {
    				var specificVotesHtml = '';
                    if (emapic.legend && emapic.legend.color) {
                        var votes;
                        for (i=0, len=emapic.legend.color.responses_array.length; i<len; i++) {
                            votes = parseInt(stat[emapic.legend.color.question + '_' + emapic.legend.color.responses_array[i].id]);
                            if (typeof totals[i] == 'undefined') {
                                totals[i] = 0;
                            }
                            totals[i] += votes;
                            total += votes;
                            specificVotesHtml += "<td><small>" + votes + "</small></td>\n";
                        }
                    }
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
                    countriesHtml += "<tr>\n" +
                        "<td class='stats-country-label'>" + stat.iso_code + "</td>\n" +
                        "<td><div class='flag-container'><span class='flag-icon flag-icon-" +
                        stat.iso_code + "'></div></span>" +
                        "</td>\n<td class='country-name'>" +
                        emapic.allCountriesData[stat.iso_code].properties.name + "</td>\n" +
                        specificVotesHtml + "<td><small>" +
                        stat.total_responses + "</small></td>\n</tr>";
    			}
    		});
            var totalsHtml = "";
            if (emapic.legend && emapic.legend.color) {
                for (var j=0, leng=emapic.legend.color.responses_array.length; j<leng; j++) {
                    totalsHtml += "<td><small>" + totals[j] + "</small></td>\n";
                }
            }
            $('#voted_countries tbody').append("<tr class='stats-country-totals'>\n" +
                "<td class='stats-country-label'></td>\n" +
                "<td colspan='2'>" + sidebarVotedCountriesData.length +
                " " + emapic.utils.getI18n('js_totals_countries', 'países') + "</td>\n" +
                totalsHtml + "<td><small>" + total + "</small></td>\n</tr>");

            $('#voted_countries tbody').append(countriesHtml);

            $('#voted_countries tbody tr').on("click", function() {
                var countryCode = $(this).find('.stats-country-label').html();
                if (countryCode !== '') {
                    emapic.centerViewCountryBounds(countryCode);
                } else {
                    emapic.map.fitBounds(allCountriesBbox);
                }
            });
        }
    }

    function populateSidebarDataAllCountries() {
        $.each(emapic.allCountriesData, function(code, country) {
            $('#all_countries tbody').append("<tr>\n" +
                "<td><span class='label label-default pull-left'>" + code + "</span></td>\n" +
                "<td class='country-name'>" + emapic.allCountriesData[code].properties.name + "</td>\n" +
                "<td><div class='flag-container'><span class='flag-icon flag-icon-" + code + "'></span></div></td>\n" +
                "</tr>");
        });

        $('#all_countries tbody tr').on("click", function() {
            var countryCode = $(this).find('.label').html();
            emapic.centerViewCountryBounds(countryCode);
        });
    }

    emapic.updateIndivVotesLayerControls = emapic.utils.overrideFunction(emapic.updateIndivVotesLayerControls, null, populateSidebarDataVotedCountries);

})(emapic);
