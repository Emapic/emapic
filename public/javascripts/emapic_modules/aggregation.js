//
// Vote aggregation by area code
//
var provincesLayer;
var provincesLayerData;
var countriesLayer;
var countriesLayerData;

var aggregationButtonsHtml = "<a id='grouping-control-region' title='" + getI18n('js_total_votes_region', 'Ver total de votos por región') + "' class='exclusive-control' href='javascript:void(0)' onclick='showVotesByProvince(this)'><img src='/images/icon-agg_region.png' style='width: 16px; height: 16px;'/></a>\
    <a id='grouping-control-country' class='exclusive-control' title='" + getI18n('js_total_votes_country', 'Ver total de votos por país') + "' href='javascript:void(0)' onclick='showVotesByCountry(this)'><img src='/images/icon-agg_country.png' style='width: 16px; height: 16px;'/></a>";

function getProvinceResultsUrl() {
    return "/api/survey/" + surveyId + "/totals/provinces";
}

function getCountryResultsUrl() {
    return "/api/survey/" + surveyId + "/totals/countries";
}

var addViewsControls = overrideFunction(addViewsControls, null, function() {
    var groupingViewsControl = L.control({position: 'topleft'});
    groupingViewsControl.onAdd = function (map) {
        this._div = L.DomUtil.create('div', 'views-control leaflet-bar');
        this._div.innerHTML = aggregationButtonsHtml;
        return this._div;
    };
    groupingViewsControl.addTo(map);
});

var updateIndivVotesLayer = overrideFunction(updateIndivVotesLayer, function() {
    deactivateButton($('#grouping-control-region'));
    deactivateButton($('#grouping-control-country'));
    if (map.hasLayer(provincesLayer)) {
        map.removeLayer(provincesLayer);
    }

    if (map.hasLayer(countriesLayer)) {
        map.removeLayer(countriesLayer);
    }
});

function hideAggregatedLayers() {
    if (map.hasLayer(provincesLayer)) {
        map.removeLayer(provincesLayer);
    }

    if (map.hasLayer(countriesLayer)) {
        map.removeLayer(countriesLayer);
    }
    
    addIndivVotesLayer();
};

function showVotesByProvince(element) {
    if (!map.hasLayer(provincesLayer)) {
        disableIndivLayerExclusiveComponents();
        if (element != null) {
            activateExclusiveButton(element);
        }
        map.removeLayer(indivVotesLayer);
        map.removeLayer(countriesLayer);
        if (map.getZoom() > 8) {
            map.setZoom(6);
        }
        map.addLayer(provincesLayer);
    } else {
        deactivateButton(element);
        hideAggregatedLayers();
    }
}

function showVotesByCountry(element) {
    if (!map.hasLayer(countriesLayer)) {
        disableIndivLayerExclusiveComponents();
        if (element != null) {
            activateExclusiveButton(element);
        }
        map.removeLayer(indivVotesLayer);
        map.removeLayer(provincesLayer);
        if (map.getZoom() > 5) {
            map.setZoom(3);
        }
        map.addLayer(countriesLayer);
    } else {
        deactivateButton(element);
        hideAggregatedLayers();
    }
}

function provincePopup(feature) {
	if (feature.properties.popup_msg) {
		return feature.properties.popup_msg;
	}
    var popup = '<h4><small>' + feature.properties.name + '</small></h4>';
    var popupProperties = '';
    var orderedVotes = {};
    // We order the votes in descending order
    for (var i in feature.properties) {
        if (i != 'name' && i != 'total_responses' && i != 'iso_code') {
			var question = i.split('_')[0];
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
    for (var i in orderedVotes) {
		for (var j in orderedVotes[i]) {
			var name = legend.color.responses[orderedVotes[i][j].name.split('_')[1]].value;
			popupProperties += '<small>' + name + ':</small> ' + orderedVotes[i][j].nr + '<br/>';
		}
		if (popupProperties != '') {
			popupProperties = popupProperties.replace(new RegExp('<br/>$'), '<hr>');
		}
    }
    return popup + popupProperties + '<small>' + getI18n('js_total_votes', 'Votos totales') + ':</small> ' + feature.properties.total_responses;
}

function countryPopup(feature) {
	if (feature.properties.popup_msg) {
		return feature.properties.popup_msg;
	}
    var popup = '<h4><small>' + feature.properties.name + '</small></h4>';
    var popupProperties = '';
    var orderedVotes = [];
    // We order the votes in descending order
    for (var i in feature.properties) {
        if (i != 'name' && i != 'total_responses' && i != 'iso_code' && i.split('_')[0] == legend.color.question) {
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
    for (var i in orderedVotes) {
		var name = legend.color.responses[orderedVotes[i].name.split('_')[1]].value;
        popupProperties += '<small>' + name + ':</small> ' + orderedVotes[i].nr + '<br/>'
    }
    if (popupProperties != '') {
        popupProperties = popupProperties.replace(new RegExp('<br/>$'), '<hr>');
    }
    return popup + popupProperties + '<small>' + getI18n('js_total_votes', 'Votos totales') + ':</small> ' + feature.properties.total_responses;
}

function getAreaStyle(feature) {
    var color = fallbackColor;
    if (legend && legend.color) {
        var biggestNr = 0,
        biggestOpt = null,
        tie = false;
        for (var i in feature.properties) {
            if (i != 'name' && i != 'total_responses' && i != 'iso_code' && i.split('_')[0] == legend.color.question) {
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

        if (tie || biggestOpt == null || !(biggestOpt in legend.color.responses)) {
            color = neutralColor;
        } else {
            color = legend.color.responses[biggestOpt].legend;
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
	if (map.hasLayer(oldLayer)) {
		map.removeLayer(oldLayer);
		map.addLayer(provincesLayer);
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
	if (map.hasLayer(oldLayer)) {
		map.removeLayer(oldLayer);
		map.addLayer(countriesLayer);
	}
}

var addAllMarkers = (function() {
    var originalAddAllMarkers = addAllMarkers;

    return function() {
        originalAddAllMarkers();

        $.getJSON(getProvinceResultsUrl(), function(data) {
            provincesLayerData = data;
            updateAggregatedProvinceLayer();
        });
        
        $.getJSON(getCountryResultsUrl(), function(data) {
            countriesLayerData = data;
            updateAggregatedCountryLayer();
        });
    }
})();

var reloadLegend = overrideFunction(reloadLegend, null, function() {
	updateAggregatedLayers();
});
