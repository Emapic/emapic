//
// Leaflet - map
//
var map = null;
var userCountryCode = 'es';
var position = null;
var precision;
var areaAprox;
var userStatus;
var indivVotesLayer;
var indivVotesLayerData;
var appName;
var surveyResults;
var resultsAfterVote = true;
var redirectUrl = "/";

var legend = {};
var fullLegend = null;
// We'll use this color, for example, in ties
var neutralColor = 'grey';
var fallbackColor = 'black';

var logicAlreadyStarted = false;

function getResultsJsonUrl() {
    return "/api/survey/" + surveyId + "/results";
}

function getLegendJsonUrl() {
    return "/api/survey/" + surveyId + "/legend";
}

function preinitEmappy() {
    loadLegend();
}

function initEmappy() {
    initializeMap();
    startMapLogic();
}

$(document).ready(function() {
    $.ajaxSetup({ cache: false });
    preinitEmappy();
});

function initializeMap() {
    var osmAttrib = 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>';
    var mapboxAttrib = "<a href='https://www.mapbox.com/about/maps/' target='_blank'>&copy; Mapbox &copy; OpenStreetMap</a> <a class='mapbox-improve-map' href='https://www.mapbox.com/map-feedback/' target='_blank'>Improve this map</a>";

    // Can't use "https://{s}.tiles.wmflabs.org" because their ssl cert is wrong
    var osmMapnikBW = new L.TileLayer('https://tiles.wmflabs.org/bw-mapnik/{z}/{x}/{y}.png', {
        minZoom : 1,
        maxZoom : 18,
        attribution : osmAttrib
    });
    var osmMapnik = new L.TileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        minZoom : 1,
        maxZoom : 18,
        attribution : osmAttrib
    });
    var mapboxSatellite = new L.TileLayer('https://{s}.tiles.mapbox.com/v4/mapbox.streets-satellite/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoiamxmZXJuYW5kZXoiLCJhIjoiOGU2OWRkMmIyZDU0NWI4Y2MyYWM5YWYxZTY4NzM5YTkifQ.0ROMoDjx2pHr3rFFcn26rw', {
        minZoom : 1,
        maxZoom : 18,
        attribution : mapboxAttrib
    });

    map = L.map('map', {
        attributionControl: false,
        zoomControl: false
    });
    map.addControl(L.control.zoom({
        zoomInTitle: getI18n('js_zoom_in', 'Zoom más'),
        zoomOutTitle: getI18n('js_zoom_out', 'Zoom menos'),
    }));
    map.addControl(L.control.attribution({
        prefix: '<a href="/legal/terms" title="' + getI18n('js_open_legal_terms_another_tab', 'Abrir cláusulas legales en otra pestaña') + '" target="_blank">' + getI18n('js_emapic_legal_terms', 'Cláusulas legales de emapic') + '</a> | <a title="A JS library for interactive maps" href="http://leafletjs.com">Leaflet</a>'
    }));

    map.setMaxBounds(
        L.latLngBounds(
            L.latLng(85, -180),
            L.latLng(-85, 180)
        )
    );
    map.addLayer(osmMapnikBW);

    var baseMaps = {
        "Escala de grises (OSM)" : osmMapnikBW,
        "Color (OSM)" : osmMapnik,
        "Satélite (Mapbox)" : mapboxSatellite
    };
    L.control.layers(baseMaps, null, {position: 'bottomright'}).addTo(map);
}

function startMapLogic() {
    // We use this flag in order to prevent a strange problem where
    // layers and controls are loaded twice
    if (logicAlreadyStarted) {
        return false;
    }
    logicAlreadyStarted = true;
    if (resultsAfterVote) {
        loadData();
    } else {
        window.location.href = redirectUrl;
    }
    return true;
}

function loadData() {
    addAllMarkers(null);
    addViewsControls();
    // If we have more than one set of legend, we display a question selector
    if (fullLegend && fullLegend.color && fullLegend.color.length > 1) {
		addQuestionSelector();
	}
    addTooltips();
}

function addTooltips() {
    $('.leaflet-bar > a').tooltip({
        placement: 'right'
    });
}

function checkGeolocationDependantControls(ids) {
    if (position == null) {
        for (var i = 0; i < ids.length; i++) {
            $('#' + ids[i]).remove();
        }
    }
}

function showMap(lat, long) {
    map.setView(position);
    map.setZoom(15);
}

function updateUserCountry(position) {
    var nominatimUrl = "https://nominatim.openstreetmap.org/reverse?email=info@emapic.es&format=json&lat="+ position[0] + "&lon=" + position[1]
    $.getJSON(nominatimUrl, function(data) {
        userCountryCode = data.address.country_code;
    });
}

function centerView(opts) {
    if ( opts.world ) {
        map.fitWorld();
    } else {
        if ( opts.zoom ) {
            map.setView(opts.pos, opts.zoom);
        } else {
            map.setView(opts.pos);
        }
    }
}

function centerViewBounds(countryCode) {
    //~ Country codes as in "ISO 3166-1 alfa-2"
    $.getJSON("/data/countries.json", function(data) {
        miny = data[countryCode].MINY;
        minx = data[countryCode].MINX;
        maxy = data[countryCode].MAXY;
        maxx = data[countryCode].MAXX;
        var countryBounds = [[miny, minx], [maxy, maxx]];
        map.fitBounds(countryBounds);
    });
}

function centerOnGeolocation(lat, long, accuracy) {
    precision = typeof accuracy !== 'undefined' ? accuracy : 50;
    position = [lat, long];

    var radius = accuracy * 0.5;
    areaAprox = L.circle([lat, long], radius, {
        fillColor: '#575757',
        color: '#575757',
        title: "Accuracy zone",
        clickable: false
    });

    if (typeof accuracy !== 'undefined') {
        map.fitBounds(areaAprox.getBounds());
    } else {
        map.setView(position, 16);
    }
}

function addViewsControls() {
}

function addQuestionSelector() {
	var questions = [];
	for (var i = 0, len = fullLegend.color.length; i<len; i++) {
		questions.push(fullLegend.color[i].text);
	}
	if (questions.length > 0) {
		L.control.selectQuestion(questions).addTo(map);
		$('#vote-chart-title').text(questions[0]);
	}
}

function deactivateExclusiveButtons() {
    $('.exclusive-control').each(function(index, element) {
        deactivateButton(element);
    });
}

function activateButton(element) {
    $(element).addClass('control-active');
}

function deactivateButton(element) {
    $(element).removeClass('control-active');
}

function toggleButton(element) {
    $(element).toggleClass('control-active');
}

function activateExclusiveButton(element) {
    deactivateExclusiveButtons();
    activateButton(element);
}

function reloadIndivVotesLayerControls() {
	updateIndivVotesLayerControls();
	addTooltips();
}

function updateIndivVotesLayerControls() {
}

function updateIndivVotesLayer() {
    if (map.hasLayer(indivVotesLayer)) {
        map.removeLayer(indivVotesLayer);
    }
    addIndivVotesLayer();
}

function getPopupHtml(data) {
    if (data.popup_msg != null) {
        return data.popup_msg;
    }
    return null;
}

function loadIndivVotesLayer() {
    return L.geoJson(indivVotesLayerData, {
        onEachFeature : function(feature, layer) {
            popupHtml = getPopupHtml(feature.properties);
            if (popupHtml != null) {
                layer.bindPopup(
                    popupHtml,
                    {
                        className: 'popup-responses popup-status-' + feature.properties.status
                    }
                );
            }
        },
        pointToLayer: function (feature, latlng) {
            var iccolor = getIconColor(feature.properties),
                clickable = getPopupHtml(feature.properties) != null;
            return L.marker(latlng, {
                icon: L.divIcon({
                    className: 'circle-icon',
                    html: getIconHtml(feature.properties, clickable)
                }),
                clickable: clickable
            });
        },
        filter: filterFeature
    });
}

function filterFeature(feature, layer) {
    return true;
}

function clearFilters() {
}

function addIndivVotesLayer() {
    indivVotesLayer = loadIndivVotesLayer();
    map.addLayer(indivVotesLayer);
    enableIndivLayerExclusiveComponents();
}

function loadLegend() {
    var legendUrl = getLegendJsonUrl();
    if (legendUrl) {
        $.getJSON(legendUrl, processLegendData);
    } else {
        initEmappy();
    }
}

function addAllMarkers() {
    var resultsUrl = getResultsJsonUrl();
    if (resultsUrl) {
        $.getJSON(resultsUrl, processMainLayerData);
    } else {
        map.fitBounds(
            L.latLngBounds(
                L.latLng(70, -160),
                L.latLng(-70, 160)
            )
        );
    }
}

function processLegendData(data) {
	fullLegend = data;
	for (var a in fullLegend) {
		legend[a] = fullLegend[a][0];
	}
    initEmappy();
}

function changeActiveLegend(type, nr) {
	legend[type] = fullLegend[type][nr];
	reloadLegend();
}

function reloadLegend() {
	clearFilters();
    if (map.hasLayer(indivVotesLayer)) {
        map.removeLayer(indivVotesLayer);
		addIndivVotesLayer();
    }
	reloadIndivVotesLayerControls();
}

function processMainLayerData(data) {
    indivVotesLayerData = data;
    addIndivVotesLayer();
    reloadIndivVotesLayerControls();
    if (indivVotesLayer != null && indivVotesLayer.getLayers().length > 0) {
        map.fitBounds(indivVotesLayer.getBounds());
    } else {
        map.fitBounds(
            L.latLngBounds(
                L.latLng(70, -160),
                L.latLng(-70, 160)
            )
        );
    }
}

function disableIndivLayerExclusiveComponents() {
}

function enableIndivLayerExclusiveComponents() {
}

function getIconColor(properties) {
    if (legend && legend.color) {
        question = legend.color.question;
        if (question && (question + '.id') in properties &&
            properties[(question + '.id')] in legend.color.responses) {
            return legend.color.responses[properties[(question + '.id')]].legend;
        }
    }
    return fallbackColor;
}

function getIconSize(properties) {
    if (legend && legend.size) {
        question = legend.size.question;
        if (question && (question + '.id') in properties &&
            properties[(question + '.id')] in legend.size.responses) {
            return parseFloat(legend.size.responses[properties[(question + '.id')]].legend);
        }
    }
    return 6;
}

function getIconHtml(properties, clickable) {
    clickable = typeof clickable !== 'undefined' ? clickable : true;
    var color = getIconColor(properties),
        size = getIconSize(properties),
        dims = Math.round(size * 3.33),
        margins = Math.round(size / 2),
        mouseoversize = size * 1.25,
        coords = size * 1.5,
        clickableJs = (clickable) ? 'onmouseover="evt.target.setAttribute(\'r\', \'' + mouseoversize + '\');" onmouseout="evt.target.setAttribute(\'r\', \'' + size + '\');"' : '';
    return '<svg height="' + dims + '" width="' + dims + '" style="margin-left: -' + margins + 'px; margin-top: -' + margins + 'px;"><circle stroke="black" cx="' + coords + '" cy="' + coords + '" r="' + size + '" fill="' + color + '" ' + clickableJs + '/></svg>'
}
