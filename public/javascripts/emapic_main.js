//
// Emapic main map related code
//

var emapic = emapic || {};

(function(emapic) {

    var allCountriesDataBboxDfd = null,
        votedCountriesDataNoGeomDfd = null,
        votedProvincesDataBboxDfd = null;

    emapic.map = null;
    emapic.mapboxToken = null;
    emapic.currentBaseLayer = null;
    emapic.position = null;
    emapic.precision = null;
    emapic.indivVotesLayer = null;
    emapic.indivVotesLayerData = null;
    emapic.surveyId = null;
    emapic.surveyResults = null;
    emapic.resultsAfterVote = true;
    emapic.redirectUrl = "/";
    emapic.legend = {};
    emapic.fullLegend = null;
    emapic.allCountriesData = {};
    emapic.votedCountriesData = {};
    emapic.votedProvincesData = {};
    // We'll use this color, for example, in ties
    emapic.neutralColor = 'grey';
    emapic.fallbackColor = 'black';
    emapic.locale = 'en';
    emapic.allLayersLoadedPromise = $.Deferred();
    // Take care when using this promise as any pan/zoom made by the user
    // would restart it completely. It will prove more useful when changing the
    // map programmatically.
    emapic.baseLayerLoadedPromise = $.Deferred();

    emapic.oldResponses = {};
    emapic.userLoggedIn = false;
    emapic.logicAlreadyStarted = false;

    emapic.getCountriesJsonBboxUrl = function() {
        return "/api/baselayers/countries?geom=bbox&lang=" + emapic.locale;
    };

    emapic.getResultsJsonUrl = function() {
        return "/api/survey/" + emapic.surveyId + "/results";
    };

    emapic.getLegendJsonUrl = function() {
        return "/api/survey/" + emapic.surveyId + "/legend";
    };

    emapic.getStatsCountriesJsonNoGeomUrl = function() {
        return "/api/survey/" + emapic.surveyId + "/totals/countries?geom=none&lang=" + emapic.locale;
    };

    emapic.getStatsProvincesJsonBboxUrl = function() {
        return "/api/survey/" + emapic.surveyId + "/totals/provinces?geom=bbox&lang=" + emapic.locale;
    };

    // Methods for loading additional JSON data. If we want to preload them, we
    // can simply call the methods and ignore the returned values.
    emapic.getAllCountriesDataBbox = function() {
        if (allCountriesDataBboxDfd === null) {
            allCountriesDataBboxDfd = emapic.utils.getJsonAlertError(
                emapic.getCountriesJsonBboxUrl()
            ).done(function(data) {
                $.each(data.features, function(i, country) {
                    if (!(country.properties.iso_code in emapic.allCountriesData)) {
                        emapic.allCountriesData[country.properties.iso_code] = {};
                        emapic.allCountriesData[country.properties.iso_code].properties = country.properties;
                    }
                    emapic.allCountriesData[country.properties.iso_code].bbox = [[country.geometry.coordinates[0][0][1], country.geometry.coordinates[0][0][0]],
                        [country.geometry.coordinates[0][2][1], country.geometry.coordinates[0][2][0]]];
                });
            });
        }
        return allCountriesDataBboxDfd;
    };

    emapic.getVotedCountriesDataNoGeom = function() {
        if (votedCountriesDataNoGeomDfd === null) {
            votedCountriesDataNoGeomDfd = emapic.utils.getJsonAlertError(
                emapic.getStatsCountriesJsonNoGeomUrl()
            ).done(function(data) {
                emapic.votedCountriesData = data;
            });
        }
        return votedCountriesDataNoGeomDfd;
    };

    emapic.getVotedProvincesDataBbox = function() {
        if (votedProvincesDataBboxDfd === null) {
            votedProvincesDataBboxDfd = emapic.utils.getJsonAlertError(
                emapic.getStatsProvincesJsonBboxUrl()
            ).done(function(data) {
                $.each(data.features, function(i, province) {
                    emapic.votedProvincesData[province.properties.adm_code] = {};
                    emapic.votedProvincesData[province.properties.adm_code].properties = province.properties;
                    emapic.votedProvincesData[province.properties.adm_code].bbox = [[province.geometry.coordinates[0][0][1], province.geometry.coordinates[0][0][0]],
                        [province.geometry.coordinates[0][2][1], province.geometry.coordinates[0][2][0]]];
                });
            });
        }
        return votedProvincesDataBboxDfd;
    };

    emapic.preinitEmapic = function() {
        // If we have a legend, we load it. Otherwise, we init the map.
        if (emapic.getLegendJsonUrl() !== null) {
            emapic.loadLegend();
        } else {
            emapic.initEmapic();
        }
    };

    emapic.initEmapic = function() {
        if (emapic.map === null) {
            emapic.initializeMap();
        }
        emapic.startMapLogic();
    };

    emapic.initializeMap = function() {
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

        var baseMaps = {};
        baseMaps[emapic.utils.getI18n('js_grayscale_osm_baselayer')] = osmMapnikBW;
        baseMaps[emapic.utils.getI18n('js_color_osm_baselayer')] = osmMapnik;

        if (emapic.mapboxToken !== null) {
            var mapboxSatellite = new L.TileLayer('https://{s}.tiles.mapbox.com/v4/mapbox.streets-satellite/{z}/{x}/{y}.png?access_token=' + emapic.mapboxToken, {
                minZoom : 1,
                maxZoom : 18,
                attribution : mapboxAttrib
            });
            baseMaps[emapic.utils.getI18n('js_satellite_mapbox_baselayer')] = mapboxSatellite;
        }

        emapic.map = L.map('map', {
            attributionControl: false,
            zoomControl: false
        });
        emapic.map.addControl(L.control.zoom({
            zoomInTitle: emapic.utils.getI18n('js_zoom_in', 'Zoom más'),
            zoomOutTitle: emapic.utils.getI18n('js_zoom_out', 'Zoom menos'),
        }));
        emapic.map.addControl(L.control.attribution({
            prefix: '<a href="/legal/terms" title="' + emapic.utils.getI18n('js_open_legal_terms_another_tab', 'Abrir cláusulas legales en otra pestaña') + '" target="_blank">' + emapic.utils.getI18n('js_emapic_legal_terms', 'Cláusulas legales de emapic') + '</a> | <a title="A JS library for interactive maps" href="http://leafletjs.com">Leaflet</a>'
        }));

        emapic.map.setMaxBounds(
            L.latLngBounds(
                L.latLng(85, -180),
                L.latLng(-85, 180)
            )
        );
        emapic.currentBaseLayer = osmMapnikBW;
        emapic.map.addLayer(osmMapnikBW);

        $.each(baseMaps, function(index, value) {
            value.on('loading', function() {
                if (emapic.baseLayerLoadedPromise === null) {
                    emapic.baseLayerLoadedPromise = $.Deferred();
                }
            });
            value.on('load', function() {
                if (emapic.baseLayerLoadedPromise !== null) {
                    emapic.baseLayerLoadedPromise.resolve();
                }
            });
        });
        L.control.layers(baseMaps, null, {position: 'bottomright'}).addTo(emapic.map);
        emapic.map.on('baselayerchange', function(layer) {
            if (emapic.currentBaseLayer != layer.layer) {
                emapic.baseLayerLoadedPromise = null;
                emapic.currentBaseLayer = layer;
            }
        });
        emapic.addTooltips();
    };

    emapic.startMapLogic = function() {
        // We use this flag in order to prevent a strange problem where
        // layers and controls are loaded twice
        if (emapic.logicAlreadyStarted) {
            return false;
        }
        emapic.logicAlreadyStarted = true;
        if (emapic.resultsAfterVote) {
            emapic.loadData();
        } else {
            window.location.href = emapic.redirectUrl;
        }
        return true;
    };

    emapic.loadData = function() {
        emapic.utils.disableMapInteraction(true);
        emapic.addAllMarkers().done(function() {
            emapic.allLayersLoadedPromise.resolve();
        }).fail(function() {
            emapic.allLayersLoadedPromise.reject();
        }).always(function() {
            emapic.utils.enableMapInteraction();
        });
        emapic.addViewsControls();
        // If we have more than one set of legend, we display a question selector
        if (emapic.fullLegend && emapic.fullLegend.color && emapic.fullLegend.color.length > 1) {
    		emapic.addQuestionSelector();
    	}
        emapic.addTooltips();
    };

    emapic.addTooltips = function() {
        $('.leaflet-bar > a').data('bs.tooltip', false);
        $('.leaflet-bar > a').tooltip({
            placement: 'right'
        });
    };

    emapic.checkGeolocationDependantControls = function(ids) {
        if (emapic.position === null) {
            for (var i = 0; i < ids.length; i++) {
                $('#' + ids[i]).remove();
            }
        }
    };

    emapic.centerView = function(opts) {
        if ( opts.world ) {
            emapic.map.fitWorld();
        } else {
            if ( opts.zoom ) {
                emapic.map.setView(opts.pos, opts.zoom);
            } else {
                emapic.map.setView(opts.pos);
            }
        }
    };

    emapic.centerViewCountryBounds = function(countryCode) {
        emapic.getAllCountriesDataBbox().done(function() {
            //~ Country codes as in "ISO 3166-1 alfa-2"
            if (countryCode in emapic.allCountriesData) {
                emapic.map.fitBounds(emapic.allCountriesData[countryCode].bbox);
            }
        });
    };

    emapic.centerOnGeolocation = function(lat, long, accuracy) {
        emapic.precision = typeof accuracy !== 'undefined' ? accuracy : 50;
        emapic.position = [lat, long];

        var radius = accuracy * 0.5,
            areaAprox = L.circle([lat, long], radius, {
                fillColor: '#575757',
                color: '#575757',
                title: "Accuracy zone",
                clickable: false
            });

        if (typeof accuracy !== 'undefined') {
            emapic.map.fitBounds(areaAprox.getBounds());
        } else {
            emapic.map.setView(emapic.position, 16);
        }
    };

    emapic.addViewsControls = function() {
    };

    emapic.addQuestionSelector = function() {
    	var questions = [];
    	for (var i = 0, len = emapic.fullLegend.color.length; i<len; i++) {
    		questions.push(emapic.fullLegend.color[i].text);
    	}
    	if (questions.length > 0) {
    		L.control.selectQuestion(questions).addTo(emapic.map);
    		$('#vote-chart-title').text(questions[0]);
    	}
    };

    emapic.deactivateExclusiveButtons = function() {
        $('.exclusive-control').each(function(index, element) {
            emapic.deactivateButton(element);
        });
    };

    emapic.activateButton = function(element) {
        $(element).addClass('control-active');
    };

    emapic.deactivateButton = function(element) {
        $(element).removeClass('control-active');
    };

    emapic.toggleButton = function(element) {
        $(element).toggleClass('control-active');
    };

    emapic.activateExclusiveButton = function(element) {
        emapic.deactivateExclusiveButtons();
        emapic.activateButton(element);
    };

    emapic.reloadIndivVotesLayerControls = function() {
    	emapic.updateIndivVotesLayerControls();
    	emapic.addTooltips();
    };

    emapic.updateIndivVotesLayerControls = function() {
    };

    emapic.updateIndivVotesLayer = function() {
        if (emapic.map.hasLayer(emapic.indivVotesLayer)) {
            emapic.map.removeLayer(emapic.indivVotesLayer);
        }
        emapic.addIndivVotesLayer();
    };

    emapic.getPopupHtml = function(data) {
        if (data.popup_msg !== null) {
            return data.popup_msg;
        }
        return null;
    };

    emapic.loadIndivVotesLayer = function() {
        return L.geoJson(emapic.indivVotesLayerData, {
            onEachFeature : function(feature, layer) {
                var popupHtml = emapic.getPopupHtml(feature.properties);
                if (popupHtml !== null) {
                    layer.bindPopup(
                        popupHtml,
                        {
                            className: 'popup-responses popup-status-' + feature.properties.status
                        }
                    );
                }
            },
            pointToLayer: function (feature, latlng) {
                var iccolor = emapic.getIconColor(feature.properties),
                    clickable = emapic.getPopupHtml(feature.properties) !== null;
                return L.marker(latlng, {
                    icon: L.divIcon({
                        className: 'circle-icon',
                        html: emapic.getIconHtml(feature.properties, clickable)
                    }),
                    clickable: clickable
                });
            },
            filter: emapic.filterFeature
        });
    };

    emapic.filterFeature = function(feature, layer) {
        return true;
    };

    emapic.clearFilters = function() {
    };

    emapic.addIndivVotesLayer = function() {
        emapic.indivVotesLayer = emapic.loadIndivVotesLayer();
        emapic.map.addLayer(emapic.indivVotesLayer);
        emapic.enableIndivLayerExclusiveComponents();
    };

    emapic.loadLegend = function() {
        emapic.utils.getJsonAlertError(
            emapic.getLegendJsonUrl()
        ).done(emapic.processLegendData);
    };

    emapic.addAllMarkers = function() {
        var resultsUrl = emapic.getResultsJsonUrl();
        if (resultsUrl) {
            return emapic.addIndivMarkers();
        } else {
            if (emapic.map) {
                emapic.map.fitBounds(
                    L.latLngBounds(
                        L.latLng(70, -160),
                        L.latLng(-70, 160)
                    )
                );
            }
            return $.when();
        }
    };

    emapic.addIndivMarkers = function() {
        return emapic.utils.getJsonAlertError(
            emapic.getResultsJsonUrl()
        ).done(emapic.processMainLayerData);
    };

    emapic.processLegendData = function(data) {
    	emapic.fullLegend = data;
    	for (var a in emapic.fullLegend) {
    		emapic.legend[a] = emapic.fullLegend[a][0];
    	}
        emapic.initEmapic();
    };

    emapic.changeActiveLegend = function(type, nr) {
    	emapic.legend[type] = emapic.fullLegend[type][nr];
    	emapic.reloadLegend();
    };

    emapic.reloadLegend = function() {
    	emapic.clearFilters();
        if (emapic.map.hasLayer(emapic.indivVotesLayer)) {
            emapic.map.removeLayer(emapic.indivVotesLayer);
    		emapic.addIndivVotesLayer();
        }
    	emapic.reloadIndivVotesLayerControls();
    };

    emapic.processMainLayerData = function(data) {
        emapic.indivVotesLayerData = data;
        emapic.addIndivVotesLayer();
        emapic.reloadIndivVotesLayerControls();
        if (emapic.indivVotesLayer !== null && emapic.indivVotesLayer.getLayers().length > 0) {
            emapic.map.fitBounds(emapic.indivVotesLayer.getBounds());
        } else {
            emapic.map.fitBounds(
                L.latLngBounds(
                    L.latLng(70, -160),
                    L.latLng(-70, 160)
                )
            );
        }
    };

    emapic.disableIndivLayerExclusiveComponents = function() {
    };

    emapic.enableIndivLayerExclusiveComponents = function() {
    };

    emapic.getIconColor = function(properties) {
        if (emapic.legend && emapic.legend.color) {
            var question = emapic.legend.color.question;
            if (question && (question + '.id') in properties &&
                properties[(question + '.id')] in emapic.legend.color.responses) {
                return emapic.legend.color.responses[properties[(question + '.id')]].legend;
            }
        }
        return emapic.fallbackColor;
    };

    emapic.getIconSize = function(properties) {
        if (emapic.legend && emapic.legend.size) {
            var question = emapic.legend.size.question;
            if (question && (question + '.id') in properties &&
                properties[(question + '.id')] in emapic.legend.size.responses) {
                return parseFloat(emapic.legend.size.responses[properties[(question + '.id')]].legend);
            }
        }
        return 6;
    };

    emapic.getIconHtml = function(properties, clickable) {
        clickable = typeof clickable !== 'undefined' ? clickable : true;
        var color = emapic.getIconColor(properties),
            size = emapic.getIconSize(properties),
            dims = Math.round(size * 3.33),
            margins = Math.round(size / 2),
            mouseoversize = size * 1.25,
            coords = size * 1.5,
            clickableJs = (clickable) ? 'onmouseover="evt.target.setAttribute(\'r\', \'' + mouseoversize + '\');" onmouseout="evt.target.setAttribute(\'r\', \'' + size + '\');"' : '';
        return '<svg height="' + dims + '" width="' + dims + '" style="margin-left: -' + margins + 'px; margin-top: -' + margins + 'px;"><circle stroke="black" cx="' + coords + '" cy="' + coords + '" r="' + size + '" fill="' + color + '" ' + clickableJs + '/></svg>';
    };

})(emapic);

$(document).ready(function() {
    $.ajaxSetup({ cache: false });
    emapic.preinitEmapic();
});
