//
// Vote aggregation by area code
//

var emapic = emapic || {};

(function(emapic) {

    var provincesLayer,
        provincesLayerData,
        countriesLayer,
        countriesLayerData,
        aggregationButtonsHtml = "<a id='grouping-control-region' title='" + emapic.utils.getI18n('js_total_votes_region', 'Ver total de votos por región') + "' class='exclusive-control' href='javascript:void(0)' onclick='emapic.modules.aggregation.showVotesByProvince(this)'><img src='/images/icon-agg_region.png' style='width: 16px; height: 16px;'/></a>\n"+
            "<a id='grouping-control-country' class='exclusive-control' title='" + emapic.utils.getI18n('js_total_votes_country', 'Ver total de votos por país') + "' href='javascript:void(0)' onclick='emapic.modules.aggregation.showVotesByCountry(this)'><img src='/images/icon-agg_country.png' style='width: 16px; height: 16px;'/></a>";

    emapic.modules = emapic.modules || {};
    emapic.modules.aggregation = emapic.modules.aggregation || {};

    emapic.modules.aggregation.getProvinceResultsUrl = function() {
        return "/api/survey/" + emapic.surveyId + "/totals/provinces";
    };

    emapic.modules.aggregation.getCountryResultsUrl = function() {
        return "/api/survey/" + emapic.surveyId + "/totals/countries";
    };

    emapic.addViewsControls = emapic.utils.overrideFunction(emapic.addViewsControls, null, function() {
        var groupingViewsControl = L.control({position: 'topleft'});
        groupingViewsControl.onAdd = function (map) {
            this._div = L.DomUtil.create('div', 'views-control leaflet-bar');
            this._div.innerHTML = aggregationButtonsHtml;
            return this._div;
        };
        groupingViewsControl.addTo(emapic.map);
    });

    emapic.updateIndivVotesLayer = emapic.utils.overrideFunction(emapic.updateIndivVotesLayer, function() {
        emapic.deactivateButton($('#grouping-control-region'));
        emapic.deactivateButton($('#grouping-control-country'));
        if (emapic.map.hasLayer(provincesLayer)) {
            emapic.map.removeLayer(provincesLayer);
        }

        if (emapic.map.hasLayer(countriesLayer)) {
            emapic.map.removeLayer(countriesLayer);
        }
    });

    function hideAggregatedLayers() {
        if (emapic.map.hasLayer(provincesLayer)) {
            emapic.map.removeLayer(provincesLayer);
        }

        if (emapic.map.hasLayer(countriesLayer)) {
            emapic.map.removeLayer(countriesLayer);
        }
        emapic.addIndivVotesLayer();
    }

    emapic.modules.aggregation.showVotesByProvince = function(element) {
        if (!emapic.map.hasLayer(provincesLayer)) {
            emapic.disableIndivLayerExclusiveComponents();
            if (element !== null) {
                emapic.activateExclusiveButton(element);
            }
            emapic.map.removeLayer(emapic.indivVotesLayer);
            emapic.map.removeLayer(countriesLayer);
            if (emapic.map.getZoom() > 8) {
                emapic.map.setZoom(6);
            }
            emapic.map.addLayer(provincesLayer);
        } else {
            emapic.deactivateButton(element);
            hideAggregatedLayers();
        }
    };

    emapic.modules.aggregation.showVotesByCountry = function(element) {
        if (!emapic.map.hasLayer(countriesLayer)) {
            emapic.disableIndivLayerExclusiveComponents();
            if (element !== null) {
                emapic.activateExclusiveButton(element);
            }
            emapic.map.removeLayer(emapic.indivVotesLayer);
            emapic.map.removeLayer(provincesLayer);
            if (emapic.map.getZoom() > 5) {
                emapic.map.setZoom(3);
            }
            emapic.map.addLayer(countriesLayer);
        } else {
            emapic.deactivateButton(element);
            hideAggregatedLayers();
        }
    };

    function provincePopup(feature) {
    	if (feature.properties.popup_msg) {
    		return feature.properties.popup_msg;
    	}
        var popup = '<h4><small>' + feature.properties.name + '</small></h4>',
            popupProperties = '',
            orderedVotes = {},
            question;
        // We order the votes in descending order
        for (var i in feature.properties) {
            if (i != 'name' && i != 'total_responses' && i != 'iso_code' &&
                i != 'country_id' && i != 'adm_code' && i != 'adm_type' &&
                i != 'country_iso_code' && i.split('_')[0] == emapic.legend.color.question) {
                question = i.split('_')[0];
                if (isNaN(question.replace('q', '')) ||
                    isNaN(i.split('_')[1])) {
                    continue;
                }
    			if (!orderedVotes[question]) {
    				orderedVotes[question] = [];
    			}
                var position = orderedVotes[question].length;
                for (var j in orderedVotes[question]) {
                    if (orderedVotes[question][j].nr < parseInt(feature.properties[i])) {
                        position = j;
                        break;
                    }
                }
                orderedVotes[question].splice(position, 0, {nr: parseInt(feature.properties[i]), name: i});
            }
        }
        for (i in orderedVotes) {
    		for (var k in orderedVotes[i]) {
    			var name = emapic.legend.color.responses[orderedVotes[i][k].name.split('_')[1]].value;
    			popupProperties += '<small>' + name + ':</small> ' + orderedVotes[i][k].nr + '<br/>';
    		}
    		if (popupProperties !== '') {
    			popupProperties = popupProperties.replace(new RegExp('<br/>$'), '<hr>');
    		}
        }
        return popup + popupProperties + '<small>' + emapic.utils.getI18n('js_total_votes', 'Votos totales') + ':</small> ' + feature.properties.total_responses;
    }

    function countryPopup(feature) {
    	if (feature.properties.popup_msg) {
    		return feature.properties.popup_msg;
    	}
        var popup = '<h4><small>' + feature.properties.name + '</small></h4>',
            popupProperties = '',
            orderedVotes = [];
        // We order the votes in descending order
        for (var i in feature.properties) {
            if (i != 'name' && i != 'total_responses' && i != 'iso_code' &&
                i.split('_')[0] == emapic.legend.color.question) {
                var position = orderedVotes.length;
                for (var j in orderedVotes) {
                    if (orderedVotes[j].nr < parseInt(feature.properties[i])) {
                        position = j;
                        break;
                    }
                }
                orderedVotes.splice(position, 0, {nr: parseInt(feature.properties[i]), name: i});
            }
        }
        for (i in orderedVotes) {
    		var name = emapic.legend.color.responses[orderedVotes[i].name.split('_')[1]].value;
            popupProperties += '<small>' + name + ':</small> ' + orderedVotes[i].nr + '<br/>';
        }
        if (popupProperties !== '') {
            popupProperties = popupProperties.replace(new RegExp('<br/>$'), '<hr>');
        }
        return popup + popupProperties + '<small>' + emapic.utils.getI18n('js_total_votes', 'Votos totales') + ':</small> ' + feature.properties.total_responses;
    }

    function getAreaStyle(feature) {
        var color = emapic.fallbackColor;
        if (emapic.legend && emapic.legend.color) {
            var biggestNr = 0,
                biggestOpt = null,
                tie = false;
            for (var i in feature.properties) {
                if (i != 'name' && i != 'total_responses' && i != 'iso_code' && i.split('_')[0] == emapic.legend.color.question) {
                    var nr = parseInt(feature.properties[i]);
                    if (nr == biggestNr) {
                        tie = true;
                    }
                    if (nr > biggestNr) {
                        tie = false;
                        biggestNr = nr;
                        biggestOpt = i.split('_')[1];
                    }
                }
            }

            if (tie || biggestOpt === null || !(biggestOpt in emapic.legend.color.responses)) {
                color = emapic.neutralColor;
            } else {
                color = emapic.legend.color.responses[biggestOpt].legend;
            }
        }

        return {
            "color": color,
            "weight": 5,
            "opacity": 0.65
        };
    }

    function updateAggregatedLayers() {
    	updateAggregatedProvinceLayer();
    	updateAggregatedCountryLayer();
    }

    function updateAggregatedProvinceLayer() {
    	var oldLayer = provincesLayer;
    	provincesLayer = L.geoJson(provincesLayerData, {
    		onEachFeature : function(feature, layer) {
    			layer.bindPopup(
    				provincePopup(feature),
    				{
    					className: 'popup-aggregated popup-aggregated-province'
    				}
    			);
    		},
    		style: getAreaStyle
    	});
    	if (emapic.map.hasLayer(oldLayer)) {
    		emapic.map.removeLayer(oldLayer);
    		emapic.map.addLayer(provincesLayer);
    	}
    }

    function updateAggregatedCountryLayer() {
    	var oldLayer = countriesLayer;
    	countriesLayer = L.geoJson(countriesLayerData, {
    		onEachFeature : function(feature, layer) {
    			layer.bindPopup(
    				countryPopup(feature),
    				{
    					className: 'popup-aggregated popup-aggregated-country'
    				}
    			);
    		},
    		style: getAreaStyle
    	});
    	if (emapic.map.hasLayer(oldLayer)) {
    		emapic.map.removeLayer(oldLayer);
    		emapic.map.addLayer(countriesLayer);
    	}
    }

    emapic.addAllMarkers = emapic.utils.overrideFunction(emapic.addAllMarkers, null, function(promise) {
            var provinceResultsDfd = $.Deferred();
            $.getJSON(emapic.modules.aggregation.getProvinceResultsUrl(), function(data) {
                provincesLayerData = data;
                updateAggregatedProvinceLayer();
                provinceResultsDfd.resolve();
            });

            var countryResultsDfd = $.Deferred();
            $.getJSON(emapic.modules.aggregation.getCountryResultsUrl(), function(data) {
                countriesLayerData = data;
                updateAggregatedCountryLayer();
                countryResultsDfd.resolve();
            });

            return $.when(promise, provinceResultsDfd.promise(), countryResultsDfd.promise());
    });

    emapic.reloadLegend = emapic.utils.overrideFunction(emapic.reloadLegend, null, function() {
    	updateAggregatedLayers();
    });

})(emapic);
