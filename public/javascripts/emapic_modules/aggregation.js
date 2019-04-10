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
        municipalitiesLayer = null,
        municipalitiesLayerData,
        municipalityResultsDfd = null,
        provinceJsonColumnsToIgnore = ['name', 'total_responses', 'iso_code', 'country_id', 'adm_code', 'adm_type', 'country_iso_code', 'supersuperheader'],
        countryJsonColumnsToIgnore = ['name', 'total_responses', 'iso_code'],
        municipalityJsonColumnsToIgnore = ['name', 'total_responses', 'adm_code', 'cod_prov', 'provincia', 'cod_ccaa', 'comautonom', 'province_adm_code', 'country_iso_code', 'superheader', 'supersuperheader'],
        aggregationMunicipalityButtonHtml = "<a id='grouping-control-municipality' title='" + emapic.utils.getI18n('js_total_votes_municipality', 'Ver total de votos por municipio (sólo España)') + "' class='exclusive-control' href='javascript:void(0)' onclick='emapic.modules.aggregation.showVotesByMunicipality(this)'><img src='/images/icon-agg_municipality.png' style='width: 16px; height: 16px;'/></a>",
        aggregationButtonsHtml = "<a id='grouping-control-country' class='exclusive-control' title='" + emapic.utils.getI18n('js_total_votes_country', 'Ver total de votos por país') + "' href='javascript:void(0)' onclick='emapic.modules.aggregation.showVotesByCountry(this)'><img src='/images/icon-agg_country.png' style='width: 16px; height: 16px;'/></a>\n" +
            "<a id='grouping-control-region' title='" + emapic.utils.getI18n('js_total_votes_region', 'Ver total de votos por región') + "' class='exclusive-control' href='javascript:void(0)' onclick='emapic.modules.aggregation.showVotesByProvince(this)'><img src='/images/icon-agg_region.png' style='width: 16px; height: 16px;'/></a>";

    emapic.modules = emapic.modules || {};
    emapic.modules.aggregation = emapic.modules.aggregation || {};

    emapic.modules.aggregation.showMunicipalities = false;

    emapic.modules.aggregation.hideIndivLayer = true;

    emapic.modules.aggregation.getProvinceResultsUrl = function() {
        return "/api/survey/" + emapic.surveyId + "/totals/provinces?lang=" + emapic.locale;
    };

    emapic.modules.aggregation.getCountryResultsUrl = function() {
        return "/api/survey/" + emapic.surveyId + "/totals/countries?lang=" + emapic.locale;
    };

    emapic.modules.aggregation.getMunicipalityResultsUrl = function() {
        return "/api/survey/" + emapic.surveyId + "/totals/municipalities?lang=" + emapic.locale;
    };

    emapic.addViewsControls = emapic.utils.overrideFunction(emapic.addViewsControls, null, function() {
        var aggregationControl = L.control({position: 'topleft'});
        aggregationControl.onAdd = function (map) {
            this._div = L.DomUtil.create('div', 'aggregation-control views-control leaflet-bar');
            this._div.innerHTML = aggregationButtonsHtml + (emapic.modules.aggregation.showMunicipalities ? "\n" + aggregationMunicipalityButtonHtml : "");
            return this._div;
        };
        aggregationControl.addTo(emapic.map);
        emapic.utils.handleCtrlBtnEvents('.aggregation-control a', aggregationControl);
    });

    emapic.updateIndivVotesLayer = emapic.utils.overrideFunction(emapic.updateIndivVotesLayer, function() {
        if (emapic.modules.aggregation.hideIndivLayer) {
            emapic.deactivateButton($('#grouping-control-municipality'));
            emapic.deactivateButton($('#grouping-control-region'));
            emapic.deactivateButton($('#grouping-control-country'));
            if (emapic.map.hasLayer(municipalitiesLayer)) {
                emapic.map.removeLayer(municipalitiesLayer);
            }

            if (emapic.map.hasLayer(provincesLayer)) {
                emapic.map.removeLayer(provincesLayer);
            }

            if (emapic.map.hasLayer(countriesLayer)) {
                emapic.map.removeLayer(countriesLayer);
            }
        }
    });

    function resetAggregatedLayer() {
        hideAggregatedLayers();
        if (emapic.modules.aggregation.hideIndivLayer) {
            emapic.addIndivVotesLayer();
        }
    }

    function hideAggregatedLayers() {
        if (emapic.map.hasLayer(municipalitiesLayer)) {
            emapic.map.removeLayer(municipalitiesLayer);
        }

        if (emapic.map.hasLayer(provincesLayer)) {
            emapic.map.removeLayer(provincesLayer);
        }

        if (emapic.map.hasLayer(countriesLayer)) {
            emapic.map.removeLayer(countriesLayer);
        }
    }

    emapic.modules.aggregation.showVotesByMunicipality = function(element) {
        if (!emapic.map.hasLayer(municipalitiesLayer)) {
            if (municipalityResultsDfd === null) {
                emapic.utils.disableMapInteraction(true);
                municipalityResultsDfd = emapic.utils.getJsonAlertError(
                    emapic.modules.aggregation.getMunicipalityResultsUrl()
                ).done(function(data) {
                    municipalitiesLayerData = data;
                    updateAggregatedMunicipalityLayer();
                }).always(emapic.utils.enableMapInteraction);
            }
            municipalityResultsDfd.done(function() {
                if (element !== null) {
                    emapic.activateExclusiveButton(element);
                }
                if (emapic.modules.aggregation.hideIndivLayer) {
                    emapic.disableIndivLayerExclusiveComponents();
                    emapic.map.removeLayer(emapic.indivVotesLayer);
                }
                hideAggregatedLayers();
                emapic.map.addLayer(municipalitiesLayer);
            });
        } else {
            emapic.deactivateButton(element);
            resetAggregatedLayer();
        }
    };

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
                hideAggregatedLayers();
                emapic.map.addLayer(provincesLayer);
            });
        } else {
            emapic.deactivateButton(element);
            resetAggregatedLayer();
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
                hideAggregatedLayers();
                emapic.map.addLayer(countriesLayer);
            });
        } else {
            emapic.deactivateButton(element);
            resetAggregatedLayer();
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
        if (feature.properties.supersuperheader) {
            popup += '<h5 class="popup-aggregated-header popup-aggregated-superheader popup-aggregated-supersuperheader">' + feature.properties.supersuperheader + '</h5>';
        }
        if (feature.properties.superheader) {
            popup += '<h5 class="popup-aggregated-header popup-aggregated-superheader">' + feature.properties.superheader + '</h5>';
        }
        popup += '<h4 class="popup-aggregated-header">' + feature.properties.name + '</h4>';
        // We order the votes in descending order
        for (var i in feature.properties) {
            if (columnsToIgnore.indexOf(i) === -1 && emapic.legend && emapic.legend.color && i.split('_')[0] == emapic.legend.color.question) {
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

    function municipalityPopup(feature) {
        return popup(feature, municipalityJsonColumnsToIgnore);
    }

    function provincePopup(feature) {
        return popup(feature, provinceJsonColumnsToIgnore);
    }

    function countryPopup(feature) {
        return popup(feature, countryJsonColumnsToIgnore);
    }

    function getAreaStyle(feature, columnsToIgnore) {
        var color,
            biggestNr = 0,
            biggestOpt = null,
            tie = false;
        for (var i in feature.properties) {
            if (columnsToIgnore.indexOf(i) === -1 && emapic.legend && emapic.legend.color && i.split('_')[0] == emapic.legend.color.question) {
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
        if (municipalitiesLayerData !== null) {
            updateAggregatedMunicipalityLayer();
        }
        if (provincesLayerData !== null) {
    	    updateAggregatedProvinceLayer();
        }
        if (countriesLayerData !== null) {
    	    updateAggregatedCountryLayer();
        }
    }

    function updateAggregatedMunicipalityLayer() {
    	var oldLayer = municipalitiesLayer;
    	municipalitiesLayer = L.geoJson(municipalitiesLayerData, {
    		onEachFeature : function(feature, layer) {
    			layer.bindPopup(
    				municipalityPopup(feature),
    				{
    					className: 'popup-aggregated popup-aggregated-province'
    				}
    			);
    		},
    		style: function(feature) {
    			return getAreaStyle(feature, municipalityJsonColumnsToIgnore);
    		}
    	});
    	if (emapic.map.hasLayer(oldLayer)) {
    		emapic.map.removeLayer(oldLayer);
    		emapic.map.addLayer(municipalitiesLayer);
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
    		style: function(feature) {
    			return getAreaStyle(feature, provinceJsonColumnsToIgnore);
    		}
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
    		style: function(feature) {
    			return getAreaStyle(feature, countryJsonColumnsToIgnore);
    		}
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
