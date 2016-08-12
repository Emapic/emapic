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
        sidebarVotedCountriesData = null,
        sidebarAllCountriesData = null,
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
        return "/api/survey/" + emapic.surveyId + "/totals/countries";
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
                emapic.centerViewBounds(emapic.geoapi.userCountryCode);
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

        $.getJSON("/data/countries.json", function(data) {
    		sidebarAllCountriesData = data;
            populateSidebarDataAllCountries();
            populateSidebarDataVotedCountries();
            if (sidebarVotedCountriesData && sidebarVotedCountriesData.features &&
                sidebarVotedCountriesData.features.length > 0) {
                emapic.modules.locators.showSidebarVotedCountries();
            }
        });
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
    		$.each(sidebarVotedCountriesData.features, function(i, stat) {
    			if (sidebarAllCountriesData[stat.properties.iso_code] !== undefined) {
    				var specificVotesHtml = '';
                    if (emapic.legend && emapic.legend.color) {
                        var votes;
                        for (i=0, len=emapic.legend.color.responses_array.length; i<len; i++) {
                            votes = parseInt(stat.properties[emapic.legend.color.question + '_' + emapic.legend.color.responses_array[i].id]);
                            if (typeof totals[i] == 'undefined') {
                                totals[i] = 0;
                            }
                            totals[i] += votes;
                            total += votes;
                            specificVotesHtml += "<td><small>" + votes + "</small></td>\n";
                        }
                    }
                    countriesHtml += "<tr>\n" +
                        "<td class='stats-country-label'>" + stat.properties.iso_code + "</td>\n" +
                        "<td><div class='flag-container'><span class='flag-icon flag-icon-" +
                        stat.properties.iso_code + "'></div></span>" +
                        "</td>\n<td class='country-name'>" +
                        sidebarAllCountriesData[stat.properties.iso_code].NAME + "</td>\n" +
                        specificVotesHtml + "<td><small>" +
                        stat.properties.total_responses + "</small></td>\n</tr>";
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
                "<td colspan='2'>" + sidebarVotedCountriesData.features.length +
                " " + emapic.utils.getI18n('js_totals_countries', 'países') + "</td>\n" +
                totalsHtml + "<td><small>" + total + "</small></td>\n</tr>");

            $('#voted_countries tbody').append(countriesHtml);

            $('#voted_countries tbody tr').on("click", function() {
                var countryCode = $(this).find('.stats-country-label').html();
                if (countryCode !== '') {
                    emapic.centerViewBounds(countryCode);
                }
            });
        }
    }

    function populateSidebarDataAllCountries() {
        $.each(sidebarAllCountriesData, function(code, country) {
            $('#all_countries tbody').append("<tr>\n" +
                "<td><span class='label label-default pull-left'>" + code + "</span></td>\n" +
                "<td class='country-name'>" + sidebarAllCountriesData[code].NAME + "</td>\n" +
                "<td><div class='flag-container'><span class='flag-icon flag-icon-" + code + "'></span></div></td>\n" +
                "</tr>");
        });

        $('#all_countries tbody tr').on("click", function() {
            var countryCode = $(this).find('.label').html();
            emapic.centerViewBounds(countryCode);
        });
    }

    emapic.updateIndivVotesLayerControls = emapic.utils.overrideFunction(emapic.updateIndivVotesLayerControls, null, populateSidebarDataVotedCountries);

})(emapic);
