//
// Emapic main map related code
//

var emapic = emapic || {};

(function(emapic) {

    var allCountriesDataBboxDfd = null,
        votedCountriesDataNoGeomDfd = null,
        votedProvincesDataBboxDfd = null,
        votedMunicipalitiesDataBboxDfd = null,
        urlAnswerIdParam = 'answer';

    emapic.map = null;
    emapic.layerControl = null;
    emapic.mapboxToken = null;
    emapic.currentBaseLayer = null;
    emapic.position = null;
    emapic.precision = null;
    emapic.indivVotesLayer = null;
    emapic.indivVotesLayerData = null;
    emapic.surveyId = null;
    emapic.surveyResults = null;
    emapic.resultsAfterVote = true;
    emapic.updateUrlWithAnswerId = false;
    emapic.selectedFeature = null;
    emapic.answerIdField = 'id';
    emapic.redirectUrl = "/";
    emapic.legend = {};
    emapic.fullLegend = null;
    emapic.allCountriesData = {};
    emapic.votedCountriesData = {};
    emapic.votedProvincesData = {};
    emapic.votedMunicipalitiesData = {};
    // We'll use this color, for example, in ties
    emapic.neutralColor = 'grey';
    emapic.fallbackColor = 'black';
    emapic.locale = 'en';
    emapic.allLayersLoadedPromise = $.Deferred();
    // Take care when using this promise as any pan/zoom made by the user
    // would restart it completely. It will prove more useful when changing the
    // map programmatically.
    emapic.baseLayerLoadedPromise = $.Deferred();

    emapic.filters = [];

    emapic.oldResponses = {};
    emapic.userLoggedIn = false;
    emapic.logicAlreadyStarted = false;

    emapic.questionSelector;

    emapic.getCountriesJsonBboxUrl = function() {
        return "/api/baselayers/countries?geom=bbox&lang=" + emapic.locale;
    };

    emapic.getCountryProvincesJsonBboxUrl = function(countryIsoCode) {
        return "/api/baselayers/provinces?geom=bbox&country=" + countryIsoCode + "&lang=" + emapic.locale;
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

    emapic.getStatsMunicipalitiesJsonBboxUrl = function() {
        return "/api/survey/" + emapic.surveyId + "/totals/municipalities?geom=bbox&lang=" + emapic.locale;
    };

    emapic.getReverseGeocodingUrl = function(lat, lon) {
        return "/api/geocoding/reverse?lat=" + lat + "&lon=" + lon + "&lang=" + emapic.locale;
    };

    emapic.getExportURL = function() {
        return "/api/survey/" + emapic.surveyId + "/export";
    };

    emapic.getExportFilteredURL = function(format) {
        var parameters = [];
        for (var i = 0, len = emapic.filters.length; i<len; i++) {
            parameters = parameters.concat(emapic.filters[i].getExportParameters());
        }
        if (format) {
            parameters.push('format=' + format);
        }
        return emapic.getExportURL() + (parameters.length > 0 ? '?' + parameters.join('&') : '');
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

    emapic.getVotedMunicipalitiesDataBbox = function() {
        if (votedMunicipalitiesDataBboxDfd === null) {
            votedMunicipalitiesDataBboxDfd = emapic.utils.getJsonAlertError(
                emapic.getStatsMunicipalitiesJsonBboxUrl()
            ).done(function(data) {
                $.each(data.features, function(i, municipality) {
                    emapic.votedMunicipalitiesData[municipality.properties.adm_code] = {};
                    emapic.votedMunicipalitiesData[municipality.properties.adm_code].properties = municipality.properties;
                    emapic.votedMunicipalitiesData[municipality.properties.adm_code].bbox = [[municipality.geometry.coordinates[0][0][1], municipality.geometry.coordinates[0][0][0]],
                        [municipality.geometry.coordinates[0][2][1], municipality.geometry.coordinates[0][2][0]]];
                });
            });
        }
        return votedMunicipalitiesDataBboxDfd;
    };

    emapic.preinitEmapic = function() {
        // If we have a legend and we must display results, we load it.
        // Otherwise, we init the map.
        if (emapic.getLegendJsonUrl() !== null && (emapic.resultsAfterVote || emapic.surveyResults)) {
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
        emapic.map = L.map('map', {
            attributionControl: false,
            zoomControl: false,
            center: [0, 0],
            zoom: 3
        });
        emapic.map.addControl(L.control.zoom({
            zoomInTitle: emapic.utils.getI18n('js_zoom_in', 'Zoom más'),
            zoomOutTitle: emapic.utils.getI18n('js_zoom_out', 'Zoom menos')
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

        emapic.addBaseLayers();

        emapic.addTooltips();
        emapic.map.on('popupopen', function(e) {
            $(e.popup.getContent()).find("img").on("load", function() {
                e.popup.update();
            });
        });
    };

    emapic.getBaseLayers = function(tryGrayScale) {
        var osmAttrib = 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>',
            mapboxAttrib = '© <a href="https://www.mapbox.com/about/maps/">Mapbox</a> © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> <strong><a href="https://www.mapbox.com/map-feedback/" target="_blank">Improve this map</a></strong>',
            osmBW,
            backupOsmBW = L.TileLayer.Grayscale ? new L.TileLayer.Grayscale('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    minZoom : 1,
                    maxZoom : 18,
                    attribution : osmAttrib
                }) : null,
            baseMaps = [];

        if (tryGrayScale && backupOsmBW) {
            osmBW = backupOsmBW;
        } else {
            // Can't use "https://{s}.tiles.wmflabs.org" because their ssl cert is wrong
            osmBW = new L.TileLayer('https://tiles.wmflabs.org/bw-mapnik/{z}/{x}/{y}.png', {
                minZoom : 1,
                maxZoom : 18,
                attribution : osmAttrib
            });

            osmBW.on('tileerror', function() {
                if (L.TileLayer.Grayscale && emapic.layerControl) {
                    console.warn("WARNING: BW-Mapnik tile server doesn't seem to work properly. " +
                        "Will try to load OSM tiles and convert them to grayscale instead.");
                    for (var i = emapic.layerControl._layers.length - 1; i>=0; i--) {
                        if (emapic.layerControl._layers[i].layer === osmBW) {
                            var checked = emapic.layerControl._layerControlInputs[i].checked;
                            emapic.map.removeLayer(osmBW);
                            emapic.layerControl._layers[i].layer = backupOsmBW;
                            emapic.layerControl._layerControlInputs[i].layerId = L.Util.stamp(backupOsmBW);
                            emapic.map.addLayer(backupOsmBW);
                            emapic.layerControl._layerControlInputs[i].checked = checked;
                            break;
                        }
                    }
                }
            });
        }

        baseMaps.push({
            label: emapic.utils.getI18n('js_grayscale_osm_baselayer'),
            value: osmBW
        });

        baseMaps.push({
            label: emapic.utils.getI18n('js_color_osm_baselayer'),
            value: new L.TileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                minZoom : 1,
                maxZoom : 18,
                attribution : osmAttrib
            })
        });

        if (emapic.mapboxToken !== null) {
            baseMaps.push({
                label: emapic.utils.getI18n('js_satellite_mapbox_baselayer'),
                value:  new L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', {
                    attribution: mapboxAttrib,
                    tileSize: 512,
                    maxZoom: 18,
                    zoomOffset: -1,
                    id: 'mapbox/satellite-streets-v11',
                    accessToken: emapic.mapboxToken
                })
            });
        }

        return baseMaps;
    };

    emapic.getOverlays = function() {
        return null;
    };

    emapic.addBaseLayers = function(tryGrayScale) {
        var control,
            baseMaps = {},
            baseMapsArray = emapic.getBaseLayers(tryGrayScale);

        emapic.currentBaseLayer = baseMapsArray[0].value;

        $.each(baseMapsArray, function(index, item) {
            baseMaps[item.label] = item.value;
            item.value.on('loading', function() {
                if (emapic.baseLayerLoadedPromise === null) {
                    emapic.baseLayerLoadedPromise = $.Deferred();
                }
            });
            item.value.on('load', function() {
                if (emapic.baseLayerLoadedPromise !== null) {
                    emapic.baseLayerLoadedPromise.resolve();
                }
            });
        });

        emapic.map.addLayer(emapic.currentBaseLayer);

        emapic.map.on('baselayerchange', function(layer) {
            if (emapic.currentBaseLayer !== layer.layer) {
                emapic.baseLayerLoadedPromise = null;
                emapic.currentBaseLayer = layer;
            }
        });
        emapic.layerControl = emapic.addLayerSelector(baseMaps, emapic.getOverlays());
    };

    emapic.addLayerSelector = function(baselayers, overlays) {
        var control = L.control.layers(baselayers, overlays, {position: 'bottomright'});
        control.addTo(emapic.map);
        return control;
    };

    emapic.startMapLogic = function() {
        // We use this flag in order to prevent a strange problem where
        // layers and controls are loaded twice
        if (emapic.logicAlreadyStarted) {
            return false;
        }
        emapic.logicAlreadyStarted = true;
        if (emapic.resultsAfterVote || emapic.surveyResults) {
            emapic.loadData();
        } else if (emapic.redirectUrl !== null) {
            window.location.href = emapic.redirectUrl;
        }
        return true;
    };

    emapic.loadData = function() {
        emapic.utils.disableMapInteraction(true);
        emapic.addViewsControls();
        emapic.addAllMarkers().done(function() {
            emapic.allLayersLoadedPromise.resolve();
        }).fail(function() {
            emapic.allLayersLoadedPromise.reject();
        }).always(function() {
            emapic.utils.enableMapInteraction();
        });
        // If we have more than one set of legend, we display a question selector
        if (emapic.fullLegend && emapic.fullLegend.color && emapic.fullLegend.color.length > 1) {
    		emapic.addQuestionSelector();
    	}
        emapic.addTooltips();
    };

    emapic.addTooltips = function() {
        $('.leaflet-bar > a').data('bs.tooltip', false);
        $('.leaflet-bar > a').each(function() {
            var $this = $(this),
                placement = $this.attr('data-placement');
            $this.tooltip({
                placement: placement ? placement : 'right',
                container: '#map'
            });
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
            // Zooms lower than 3 usually look bad, with plenty of empty space
            if (emapic.map.getZoom() < 3) {
                emapic.map.setZoom(3);
            }
        } else if ( opts.answers ) {
            emapic.map.fitBounds(emapic.indivVotesLayer.getBounds());
        } else if ( opts.zoom ) {
            emapic.map.setView(opts.pos, opts.zoom);
        } else {
            emapic.map.setView(opts.pos);
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

    emapic.centerOnGeolocation = function(lat, long, accuracy, zoom) {
        emapic.precision = typeof accuracy !== 'undefined' ? accuracy : 50;
        emapic.position = [lat, long];

        if (!zoom && zoom !== 0) {
            zoom = 16;
        }

        emapic.map.setView(emapic.position, zoom);
        if (typeof accuracy !== 'undefined') {
            var radius = accuracy * 0.5,
                areaAprox = L.circle([lat, long], {
                    radius: radius,
                    fillColor: '#575757',
                    color: '#575757',
                    title: "Accuracy zone",
                    opacity: 0,
                    fillOpacity: 0,
                    interactive: false
                });
            areaAprox.addTo(emapic.map);
            emapic.map.fitBounds(areaAprox.getBounds());
            areaAprox.remove();
        }
    };

    emapic.showMarker = function(marker) {
        if (emapic.map.getBounds().contains(marker.getLatLng())) {
            return;
        }
        emapic.map.setView(marker.getLatLng());
    };

    emapic.getCurrentMarkerToShow = function() {
        return null;
    };

    emapic.addViewsControls = function() {
    };

    emapic.addQuestionSelector = function() {
    	var questions = [];
    	for (var i = 0, len = emapic.fullLegend.color.length; i<len; i++) {
    		questions.push(emapic.fullLegend.color[i].text);
    	}
    	if (questions.length > 0) {
            emapic.questionSelector = L.control.selectQuestion(questions, {
                filterActiveText: emapic.utils.getI18n('js_filter_active', 'filtro activo'),
            });
            emapic.questionSelector.addTo(emapic.map);
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
        if (emapic.questionSelector) {
            emapic.questionSelector._update();
        }
    };

    emapic.updateIndivVotesLayer = function() {
        if (emapic.map.hasLayer(emapic.indivVotesLayer)) {
            emapic.map.removeLayer(emapic.indivVotesLayer);
        }
        emapic.addIndivVotesLayer();
    };

    emapic.getPopupHtml = function(data) {
        if ('popup_msg' in data && data.popup_msg !== null) {
            return data.popup_msg;
        }
        return null;
    };

    emapic.indivVotesLayerOnEachFeature = function(data) {
        var popupHtml = emapic.getPopupHtml(data.feature.properties);
        if (popupHtml !== null) {
            data.layer.bindPopup(
                popupHtml,
                {
                    className: 'popup-responses' + ('status' in data.feature.properties ? ' popup-status-' + data.feature.properties.status : '')
                }
            );
            data.layer.on('popupopen', function(e) {
                emapic.indivVotesLayerFeatureSelected(data.feature);
            });
            data.layer.on('popupclose', function(e) {
                emapic.indivVotesLayerFeatureUnselected(data.feature);
            });
        }
        return data;
    };

    emapic.loadIndivVotesLayer = function() {
        var answerToShowId = parseInt(emapic.utils.getURLParameter(urlAnswerIdParam));
        return L.geoJson(emapic.indivVotesLayerData, {
            onEachFeature : function(feature, layer) {
                emapic.indivVotesLayerOnEachFeature({
                    feature: feature,
                    layer: layer
                });
                if (emapic.updateUrlWithAnswerId && !isNaN(answerToShowId) &&
                  answerToShowId == feature.properties[emapic.answerIdField]) {
                    emapic.allLayersLoadedPromise.done(function() {
                        setTimeout(function() {
                            emapic.showMarker(layer);
                            layer.fireEvent('click');
                        }, 500);
                    });
                }
            },
            pointToLayer: emapic.getIconMarker,
            filter: emapic.filterFeature
        });
    };

    emapic.indivVotesLayerFeatureSelected = function(feature) {
        if (emapic.updateUrlWithAnswerId && window.history.pushState) {
            var newUrl = emapic.utils.changeURLParameter(urlAnswerIdParam, feature.properties[emapic.answerIdField]);
            window.history.pushState({path: newUrl}, '', newUrl);
        }
        emapic.selectedFeature = feature;
    };

    emapic.indivVotesLayerFeatureUnselected = function(feature) {
        if (emapic.updateUrlWithAnswerId && window.history.pushState &&
          parseInt(emapic.utils.getURLParameter(urlAnswerIdParam)) === feature.properties[emapic.answerIdField]) {
            var newUrl = emapic.utils.changeURLParameter(urlAnswerIdParam, null);
            window.history.pushState({path: newUrl}, '', newUrl);
        }
        emapic.selectedFeature = null;
    };

    emapic.filterFeature = function(feature) {
        for (var i = 0, iLen = emapic.filters.length; i<iLen; i++) {
            if (emapic.filters[i].isFilterActive() && !emapic.filters[i].applyFilter(feature)) {
                return false;
            }
        }
        return true;
    };

    emapic.addFilter = function(filter) {
        if ($.inArray(filter, emapic.filters) === -1) {
            emapic.filters.push(filter);
        }
    };

    emapic.removeFilter = function(filter) {
        var idx = $.inArray(filter, emapic.filters);
        if (idx !== -1) {
            emapic.filters.splice(idx, 1);
        }
    };

    emapic.removeAllFilters = function() {
        emapic.filters = [];
    };

    emapic.filtersUpdated = function() {
        emapic.applyFilters();
    };

    emapic.applyFilters = function() {
        emapic.updateIndivVotesLayer();
        emapic.updateIndivVotesLayerControls();
    };

    emapic.clearFilters = function() {
        var filtersCleared = false;
        for (var i = 0, iLen = emapic.filters.length; i<iLen; i++) {
            if (emapic.filters[i].isFilterActive()) {
                emapic.filters[i].clearFilter();
                filtersCleared = true;
            }
        }
        return filtersCleared;
    };

    emapic.getActiveFilters = function() {
        var filters = [];
        for (var i = 0, iLen = emapic.filters.length; i<iLen; i++) {
            if (emapic.filters[i].isFilterActive()) {
                filters.push(emapic.filters[i]);
            }
        }
        return filters;
    };

    emapic.getActiveFiltersOnQuestion = function(qstnId) {
        var filters = [];
        for (var i = 0, iLen = emapic.filters.length; i<iLen; i++) {
            if (emapic.filters[i].isFilterActiveOnQuestion(qstnId)) {
                filters.push(emapic.filters[i]);
            }
        }
        return filters;
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
            // If we only received an array with the responses' legend,
            // create a map for easily accessing them
            if (Array.isArray(emapic.fullLegend[a][0].responses)) {
                for (var i = 0, iLen = emapic.fullLegend[a].length; i<iLen; i++) {
                    emapic.fullLegend[a][i].responses_array = emapic.fullLegend[a][i].responses;
                    emapic.fullLegend[a][i].responses = {};
                    for (var j = 0, jLen = emapic.fullLegend[a][i].responses_array.length; j<jLen; j++) {
                        emapic.fullLegend[a][i].responses[emapic.fullLegend[a][i].responses_array[j].id] = emapic.fullLegend[a][i].responses_array[j];
                    }
                }
            }
    		emapic.legend[a] = emapic.fullLegend[a][0];
    	}
        emapic.initEmapic();
    };

    emapic.changeActiveLegend = function(type, nr) {
    	emapic.legend[type] = emapic.fullLegend[type][nr];
    	emapic.reloadLegend();
    };

    emapic.getLegendQuestionId = function(type, nr) {
        return emapic.fullLegend[type][nr].question;
    };

    emapic.reloadLegend = function() {
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

    emapic.getCurrentIconColorForAnswer = function(answer) {
        if (answer !== null && emapic.legend && emapic.legend.color && answer in emapic.legend.color.responses) {
            return emapic.legend.color.responses[answer].legend;
        }
        return emapic.fallbackColor;
    };

    emapic.getIconColor = function(properties) {
        var answer = null;
        if (emapic.legend && emapic.legend.color) {
            var question = emapic.legend.color.question;
            if (question && (question + '.id') in properties) {
                answer = properties[(question + '.id')];
            }
        }
        return emapic.getCurrentIconColorForAnswer(answer);
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

    emapic.getIconMarker = function (feature, latlng) {
        var clickable = emapic.getPopupHtml(feature.properties) !== null;
        return L.marker(latlng, {
            icon: emapic.getIcon(feature.properties, clickable),
            interactive: clickable
        });
    };

    emapic.getIcon = function(properties, clickable) {
        var imageUrl;
        if (emapic.fullLegend && emapic.fullLegend.singleicon) {
            imageUrl = emapic.fullLegend.singleicon;
        }

        if (imageUrl) {
            return L.divIcon({
                className: 'svg-marker',
                html: emapic.utils.getIconImageHtml(imageUrl, emapic.getIconColor(properties)),
                iconAnchor: [16.5, 45]
            });
        } else {
            return L.divIcon({
                className: 'circle-icon',
                html: emapic.getIconHtml(properties, clickable)
            });
        }
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

    emapic.sidebarPanelClose = function () {
    };

    emapic.getIndivVotesLayerLeafletLayers = function () {
        return emapic.indivVotesLayer.getLayers();
    };

    emapic.Filter = function(options) {

        this.applyFilter = (typeof options.applyFilter === 'function') ? options.applyFilter : function(feature) {
            // Return true if the feature fulfills the filter conditions,
            // false otherwise
            return true;
        };

        this.clearFilter = (typeof options.clearFilter === 'function') ? options.clearFilter : function() {
            // Do whatever is needed to clear the filter
        };

        this.isFilterActive = (typeof options.isFilterActive === 'function') ? options.isFilterActive : function() {
            // Return true if the filter is actually doing any kind of feature
            // filtering, false otherwise
            return false;
        };

        this.isFilterActiveOnQuestion = (typeof options.isFilterActiveOnQuestion === 'function') ? options.isFilterActiveOnQuestion : function(qstnId) {
            // Return true if the filter is actually doing any kind of feature
            // filtering related to the question with the provided id, false otherwise
            return false;
        };

        this.getBriefDescription = (typeof options.getBriefDescription === 'function') ? options.getBriefDescription : function() {
            // Return a brief string describing the filter's function
            return null;
        };

        this.getExportParameters = (typeof options.getExportParameters === 'function') ? options.getExportParameters : function() {
            // Return an array of GET parameters as strings
            return [];
        };

    };

})(emapic);

$(document).ready(function() {
    $.ajaxSetup({ cache: false });
    emapic.preinitEmapic();
});
