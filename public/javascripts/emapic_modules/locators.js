//
// Locator tools code
//
var allCountries = $('#all_countries');
var votedCountries = $('#voted_countries');
var sidebarVotedCountriesData = null;
var sidebarAllCountriesData = null;

$('html body').append('<!-- SIDEBAR --------------------------------------------------- -->\
    <div id="sidebar">\
        <div id="all_countries"></div>\
        <div id="voted_countries"></div>\
    </div>');

var locatorsButtonsHtml = "<a id='control-user' title='" + getI18n('js_see_my_position', 'Ver mi posición') + "' href='javascript:void(0)' onclick='controlViewTo(\"user\")'><span class='glyphicon glyphicon-user'></span></a>\
    <a id='control-country' title='" + getI18n('js_see_my_country', 'Ver mi país') + "' href='javascript:void(0)' onclick='controlViewTo(\"country\")'><img src='/images/icon-espana.png' /></a>\
    <a id='control-country-filter' title='" + getI18n('js_see_per_country', 'Ver por país') + "' href='javascript:void(0)' onclick='filterCountry()'><span class='glyphicon glyphicon-flag'></span></a>\
    <a id='control-world' title='" + getI18n('js_see_whole_world', 'Ver todo el mundo') + "' href='javascript:void(0)' onclick='controlViewTo(\"world\")'><span class='glyphicon glyphicon-globe'></span></a>";

var geolocationDependantBtns = ['control-user', 'control-country'];

var sidebar, allCountries = $('#all_countries'), votedCountries = $('#voted_countries');
var allCountriesHtml = "\
    <h3>" + getI18n('js_see_country', 'Ver país') + "</h3>\
    <div class='row'>\
    <div class='col-md-6'>\
        <div class='btn-group'>\
            <button type='button' class='btn btn-sm' onclick='showSidebarVotedCountries();'>" + getI18n('js_most_voted', '+ votados') + "</button>\
            <button type='button' class='btn btn-sm active'>" + getI18n('js_all', 'todos') + "</button>\
        </div>\
    </div>\
    <div class='col-md-6'>\
        <input type='text' id='country-search' class='form-control input-sm search-countries' oninput='searchCountries(\"all_countries\");'>\
    </div>\
    </div>\
    <table class='table table-responsive' id='countries-table-all'><tbody></tbody></table>\
";
var votedCountriesHtml = "\
    <h3>" + getI18n('js_see_country', 'Ver país') + "</h3>\
    <div class='row'>\
    <div class='col-md-6'>\
        <div class='btn-group'>\
            <button type='button' class='btn btn-sm active'>" + getI18n('js_most_voted', '+ votados') + "</button>\
            <button type='button' class='btn btn-sm' onclick='showSidebarAllCountries();'>" + getI18n('js_all', 'todos') + "</button>\
        </div>\
    </div>\
    <div class='col-md-6'>\
        <input type='text' id='country-search' class='form-control input-sm search-countries' oninput='searchCountries(\"voted_countries\");'>\
    </div>\
    </div>\
    <table class='table table-responsive text-center' id='countries-table'>\
        <thead>\
            <tr>\
                <td></td>\
                <td><small>" + getI18n('js_country_of_origin', 'País de origen') + "</small></td>\
                {{specificVotesHtml}}\
                <td><small>" + getI18n('js_total_votes', 'Votos totales') + "</small></td>\
            </tr>\
        </thead>\
        <tbody></tbody>\
    </table>\
";

function getStatsCountriesJsonUrl() {
    return "/api/survey/" + surveyId + "/totals/countries";
}

var initializeMap = overrideFunction(initializeMap, null, function() {
    sidebar = L.control.sidebar('sidebar', {
        position: 'right'
    });
    map.addControl(sidebar);
});

var addViewsControls = overrideFunction(addViewsControls, null, function() {
    var viewsControl = L.control({position: 'topleft'});
    viewsControl.onAdd = function (map) {
        this._div = L.DomUtil.create('div', 'views-control leaflet-bar');
        this._div.innerHTML = locatorsButtonsHtml;
        return this._div;
    };
    viewsControl.addTo(map);
    checkGeolocationDependantControls(geolocationDependantBtns);
    populateSidebar();
});

function searchCountries(component) {
    search = $('#' + component + ' .search-countries').val().toLowerCase();
    if (search == null || search.trim().length == 0) {
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
}

function controlViewTo(view) {
    if ( view == 'user' ) {
        centerView({pos: position, zoom:12});
    } else if ( view == 'country' ) {
        if ( userCountryCode ) {
            centerViewBounds(userCountryCode);
        } else {
            centerView({pos: position, zoom:5});
        }
    } else if ( view == 'world' ) {
        centerView({world: true});
    }
}

function filterCountry() {
    sidebar.toggle();
}

function showSidebarAllCountries() {
    votedCountries.hide();
    allCountries.show();
}

function showSidebarVotedCountries() {
    allCountries.hide();
    votedCountries.show();
}

function populateSidebar() {
    allCountries.html(allCountriesHtml);

    $.getJSON(getStatsCountriesJsonUrl(), populateSidebarData);
}

function populateSidebarData(stats) {
	sidebarVotedCountriesData = stats;

    $.getJSON("/data/countries.json", function(data) {
		sidebarAllCountriesData = data;
        populateSidebarDataAllCountry();
        populateSidebarDataVotedCountry();
        if (sidebarVotedCountriesData && sidebarVotedCountriesData.features &&
            sidebarVotedCountriesData.features.length > 0) {
            showSidebarVotedCountries();
        }
    });
}

function populateSidebarDataVotedCountry() {
    if (sidebarVotedCountriesData) {
        var specificVotesHtml = '';
        if (legend && legend.color) {
            for (var i=0, len=legend.color.responses_array.length; i<len; i++) {
                specificVotesHtml += "<td><small>" + escapeHtml(legend.color.responses_array[i].value) + "</small></td>\n";
            }
        }
        votedCountries.html(votedCountriesHtml.replace('{{specificVotesHtml}}', specificVotesHtml));
		$.each(sidebarVotedCountriesData.features, function(i, stat) {
			if (sidebarAllCountriesData[stat.properties.iso_code] !== undefined) {
				var specificVotesHtml = '';
                if (legend && legend.color) {
                    for (var i=0, len=legend.color.responses_array.length; i<len; i++) {
                        specificVotesHtml += "<td><small>" + stat.properties[legend.color.question + '_' + legend.color.responses_array[i].id] + "</small></td>\n";
                    }
                }
				$('#voted_countries tbody').append("\
					<tr>\
						<td class='stats-country-label'>" + stat.properties.iso_code + "</td>\
						<td><img class='pull-left' src='/images/flags/gif/" + stat.properties.iso_code + ".gif' /></td>\
						<td class='country-name'>" + sidebarAllCountriesData[stat.properties.iso_code].NAME + "</td>\
						" + specificVotesHtml +
						"<td><small>" + stat.properties.total_responses + "</small></td>\
					</tr>\
				");
			}
		});

        $('#voted_countries tbody tr').on("click", function() {
            var countryCode = $(this).find('.stats-country-label').html();
            centerViewBounds(countryCode);
        });
    }
}

function populateSidebarDataAllCountry() {
    $.each(sidebarAllCountriesData, function(code, country) {
        $('#all_countries tbody').append("\
            <tr>\
                <td><span class='label label-default pull-left'>" + code + "</span></td>\
                <td class='country-name'>" + sidebarAllCountriesData[code].NAME + "</td>\
                <td><img class='pull-right' src='/images/flags/gif/" + code + ".gif' /></td>\
            </tr>\
        ");
    });

    $('#all_countries tbody tr').on("click", function() {
        var countryCode = $(this).find('.label').html();
        centerViewBounds(countryCode);
    });
}

updateIndivVotesLayerControls = overrideFunction(updateIndivVotesLayerControls, null, populateSidebarDataVotedCountry);
