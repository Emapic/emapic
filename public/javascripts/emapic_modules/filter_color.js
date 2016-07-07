//
// Filter markers by legend's color attribute
//
var filterProperty;
var filterViewsControl;

var addViewsControls = overrideFunction(addViewsControls, null, function() {
    if (legend && legend.color) {
        var filterStatusButtonsHtml = getCurrentLegendFilterStatusButtonsHtml();
        filterViewsControl = L.control({position: 'topleft'});
        filterViewsControl.onAdd = function (map) {
            this._div = L.DomUtil.create('div', 'views-control leaflet-bar');
            this._div.innerHTML = filterStatusButtonsHtml;
            return this._div;
        };
        filterViewsControl.addTo(map);
    }
});

function reloadFilterButtons() {
    if (legend && legend.color) {
        var filterStatusButtonsHtml = getCurrentLegendFilterStatusButtonsHtml();
        filterViewsControl._div.innerHTML = filterStatusButtonsHtml;
    }
}

function getCurrentLegendFilterStatusButtonsHtml() {
    var filterStatusButtonsHtml = '';
    for (var i=0, len=legend.color.responses_array.length; i<len; i++) {
        filterStatusButtonsHtml += "<a id='filter-control-"+ i + "' title=\"" + getI18n('js_see_only_votes', 'Ver sólo votos para ') + "'" + escapeHtml(legend.color.responses_array[i].value) + "'\" class='filter-control exclusive-control' href='javascript:void(0)' onclick='filterPropertyBtn([\"" + legend.color.question + ".id\", " + i + "], this)'><span class='glyphicon'><div class='filter-btn-circle' style='background-color: " + legend.color.responses_array[i].legend + ";'></div></span></a>";
    }
    filterStatusButtonsHtml += "<a id='filter-control-all' title='" + getI18n('js_see_all_votes', 'Ver todos los votos') + "' class='filter-control exclusive-control" + (map.hasLayer(indivVotesLayer) ? " control-active" : "") + "' href='javascript:void(0)' onclick='filterPropertyBtn(null, this)'><span class='glyphicon glyphicon-asterisk'></span></a>";
    return filterStatusButtonsHtml;
}

updateIndivVotesLayerControls = overrideFunction(updateIndivVotesLayerControls, null, reloadFilterButtons);

function filterPropertyBtn(property, element) {
    filterProperty = property;
    updateIndivVotesLayer();
}

addIndivVotesLayer = overrideFunction(addIndivVotesLayer, null, function() {
	if (filterProperty == null) {
		activateExclusiveButton($('#filter-control-all'));
	} else {
		activateExclusiveButton($('#filter-control-' + filterProperty[1]));
	}
});

var clearFilters = overrideFunction(clearFilters, null, function() {
    filterProperty = null;
});

var filterFeature = (function(){
    var originalFilterFeature = filterFeature;
    return function(feature, layer) {
        return (originalFilterFeature(feature, layer) && !(filterProperty && (feature.properties[filterProperty[0]] != legend.color.responses_array[filterProperty[1]].id)));
    }
})();
