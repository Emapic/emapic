//
// Vote aggregation by area code
//

var emapic = emapic || {};

(function(emapic) {

    var provincesLayer = null,
        provincesLayerData,
        provinceResultsDfd = null,
        countriesLayer = null,
        countriesLayerData,
        countryResultsDfd = null,
        provinceJsonColumnsToIgnore = ['name', 'total_responses', 'iso_code', 'country_id', 'adm_code', 'adm_type', 'country_iso_code'],
        countryJsonColumnsToIgnore = ['name', 'total_responses', 'iso_code'],
        aggregationButtonsHtml = "<a id='grouping-control-region' title='" + emapic.utils.getI18n('js_total_votes_region', 'Ver total de votos por región') + "' class='exclusive-control' href='javascript:void(0)' onclick='emapic.modules.aggregation.showVotesByProvince(this)'><img src='/images/icon-agg_region.png' style='width: 16px; height: 16px;'/></a>\n"+
            "<a id='grouping-control-country' class='exclusive-control' title='" + emapic.utils.getI18n('js_total_votes_country', 'Ver total de votos por país') + "' href='javascript:void(0)' onclick='emapic.modules.aggregation.showVotesByCountry(this)'><img src='/images/icon-agg_country.png' style='width: 16px; height: 16px;'/></a>";

    emapic.modules = emapic.modules || {};
    emapic.modules.aggregation = emapic.modules.aggregation || {};

    emapic.modules.aggregation.hideIndivLayer = true;

    emapic.modules.aggregation.getProvinceResultsUrl = function() {
        return "/api/survey/" + emapic.surveyId + "/totals/provinces?lang=" + emapic.locale;
    };

    emapic.modules.aggregation.getCountryResultsUrl = function() {
        return "/api/survey/" + emapic.surveyId + "/totals/countries?lang=" + emapic.locale;
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
        if (emapic.modules.aggregation.hideIndivLayer) {
            emapic.deactivateButton($('#grouping-control-region'));
            emapic.deactivateButton($('#grouping-control-country'));
            if (emapic.map.hasLayer(provincesLayer)) {
                emapic.map.removeLayer(provincesLayer);
            }

            if (emapic.map.hasLayer(countriesLayer)) {
                emapic.map.removeLayer(countriesLayer);
            }
        }
    });

    function hideAggregatedLayers() {
        if (emapic.map.hasLayer(provincesLayer)) {
            emapic.map.removeLayer(provincesLayer);
        }

        if (emapic.map.hasLayer(countriesLayer)) {
            emapic.map.removeLayer(countriesLayer);
        }
        if (emapic.modules.aggregation.hideIndivLayer) {
            emapic.addIndivVotesLayer();
        }
    }

    emapic.modules.aggregation.showVotesByProvince = function(element) {
        if (!emapic.map.hasLayer(provincesLayer)) {
            if (provinceResultsDfd === null) {
                emapic.utils.disableMapInteraction(true);
                provinceResultsDfd = emapic.utils.getJsonAlertError(
                    emapic.modules.aggregation.getProvinceResultsUrl()
                ).done(function(data) {
                    provincesLayerData = data;
                    updateAggregatedProvinceLayer();
                }).always(emapic.utils.enableMapInteraction);
            }
            provinceResultsDfd.done(function() {
                if (element !== null) {
                    emapic.activateExclusiveButton(element);
                }
                if (emapic.modules.aggregation.hideIndivLayer) {
                    emapic.disableIndivLayerExclusiveComponents();
                    emapic.map.removeLayer(emapic.indivVotesLayer);
                }
                if (countriesLayer !== null) {
                    emapic.map.removeLayer(countriesLayer);
                }
                emapic.map.addLayer(provincesLayer);
            });
        } else {
            emapic.deactivateButton(element);
            hideAggregatedLayers();
        }
    };

    emapic.modules.aggregation.showVotesByCountry = function(element) {
        if (!emapic.map.hasLayer(countriesLayer)) {
            if (countryResultsDfd === null) {
                emapic.utils.disableMapInteraction(true);
                countryResultsDfd = emapic.utils.getJsonAlertError(
                    emapic.modules.aggregation.getCountryResultsUrl()
                ).done(function(data) {
                    countriesLayerData = data;
                    updateAggregatedCountryLayer();
                }).always(emapic.utils.enableMapInteraction);
            }
            countryResultsDfd.done(function() {
                if (element !== null) {
                    emapic.activateExclusiveButton(element);
                }
                if (emapic.modules.aggregation.hideIndivLayer) {
                    emapic.disableIndivLayerExclusiveComponents();
                    emapic.map.removeLayer(emapic.indivVotesLayer);
                }
                if (provincesLayer !== null) {
                    emapic.map.removeLayer(provincesLayer);
                }
                emapic.map.addLayer(countriesLayer);
            });
        } else {
            emapic.deactivateButton(element);
            hideAggregatedLayers();
        }
    };

    function popup(feature, columnsToIgnore) {
    	if (feature.properties.popup_msg) {
    		return feature.properties.popup_msg;
    	}
        var popup = '',
            popupProperties = '',
            orderedVotes = {},
            question;
        if (feature.properties.superheader) {
            popup += '<h5 class="popup-aggregated-superheader">' + feature.properties.superheader + '</h5>';
        }
        popup += '<h4 class="popup-aggregated-header">' + feature.properties.name + '</h4>';
        // We order the votes in descending order
        for (var i in feature.properties) {
            if (columnsToIgnore.indexOf(i) === -1 && i.split('_')[0] == emapic.legend.color.question) {
                question = i.split('_')[0];
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
    			popupProperties += '<div class="popup-aggregated-result"><label>' + name + ':</label><span>' + orderedVotes[i][k].nr + '</span></div>';
    		}
        }
        return popup + popupProperties + '<hr><div class="popup-aggregated-result popup-aggregated-total"><label>' + emapic.utils.getI18n('js_total_votes', 'Votos totales') + ':</label><span>' + feature.properties.total_responses + '</span></div>';
    }

    function provincePopup(feature) {
        return popup(feature, provinceJsonColumnsToIgnore);
    }

    function countryPopup(feature) {
        return popup(feature, countryJsonColumnsToIgnore);
    }

    function getAreaStyle(feature) {
        var color,
            biggestNr = 0,
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

        if (tie) {
            color = emapic.neutralColor;
        } else {
            color = emapic.getCurrentIconColorForAnswer(biggestOpt);
        }

        return {
            "color": color,
            "weight": 5,
            "opacity": 0.65
        };
    }

    function updateAggregatedLayers() {
        if (provincesLayerData !== null) {
    	    updateAggregatedProvinceLayer();
        }
        if (countriesLayerData !== null) {
    	    updateAggregatedCountryLayer();
        }
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

    emapic.reloadLegend = emapic.utils.overrideFunction(emapic.reloadLegend, null, function() {
    	updateAggregatedLayers();
    });

})(emapic);
