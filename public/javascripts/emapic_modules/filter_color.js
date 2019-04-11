//
// Filter markers by legend's color attribute
//

var emapic = emapic || {};

(function(emapic) {

    var filterProperty,
        filterViewsControl;

    emapic.modules = emapic.modules || {};
    emapic.modules.filterColor = emapic.modules.filterColor || {};

    emapic.modules.filterColor.filter = new emapic.Filter({
        applyFilter: function(feature) {
            return !(filterProperty && (feature.properties[filterProperty[0]] != emapic.legend.color.responses_array[filterProperty[1]].id));
        },
        clearFilter: function() {
            filterProperty = null;
        },
        isFilterActive: function() {
            return !!(filterProperty);
        }
    });

    emapic.addFilter(emapic.modules.filterColor.filter);

    emapic.addViewsControls = emapic.utils.overrideFunction(emapic.addViewsControls, null, function() {
        if (emapic.legend && emapic.legend.color) {
            var filterStatusButtonsHtml = getCurrentLegendFilterStatusButtonsHtml();
            filterViewsControl = L.control({position: 'topleft'});
            filterViewsControl.onAdd = function (map) {
                this._div = L.DomUtil.create('div', 'filtering-control views-control leaflet-bar');
                this._div.innerHTML = filterStatusButtonsHtml;
                return this._div;
            };
            filterViewsControl.addTo(emapic.map);
            emapic.utils.handleCtrlBtnEvents('.filtering-control a', filterViewsControl);
        }
    });

    function reloadFilterButtons() {
        if (emapic.legend && emapic.legend.color) {
            var filterStatusButtonsHtml = getCurrentLegendFilterStatusButtonsHtml();
            filterViewsControl._div.innerHTML = filterStatusButtonsHtml;
        }
    }

    function getCurrentLegendFilterStatusButtonsHtml() {
        var filterStatusButtonsHtml = '';
        for (var i=0, len=emapic.legend.color.responses_array.length; i<len; i++) {
            filterStatusButtonsHtml += "<a id='filter-control-"+ i + "' title=\"" + emapic.utils.getI18n('js_see_only_votes', 'Ver sólo votos para ') + "'" + emapic.utils.escapeHtml(emapic.legend.color.responses_array[i].value) + "'\" class='filter-control exclusive-control' href='javascript:void(0)' onclick='filterPropertyBtn([\"" + emapic.legend.color.question + ".id\", " + i + "], this)'><span class='glyphicon'><div class='filter-btn-circle' style='background-color: " + emapic.legend.color.responses_array[i].legend + ";'></div></span></a>";
        }
        filterStatusButtonsHtml += "<a id='filter-control-all' title='" + emapic.utils.getI18n('js_see_all_votes', 'Ver todos los votos') + "' class='filter-control exclusive-control" + (emapic.map.hasLayer(emapic.indivVotesLayer) ? " control-active" : "") + "' href='javascript:void(0)' onclick='filterPropertyBtn(null, this)'><span class='glyphicon glyphicon-asterisk'></span></a>";
        return filterStatusButtonsHtml;
    }

    emapic.updateIndivVotesLayerControls = emapic.utils.overrideFunction(emapic.updateIndivVotesLayerControls, null, reloadFilterButtons);

    function filterPropertyBtn(property, element) {
        filterProperty = property;
        emapic.applyFilters();
    }

    emapic.addIndivVotesLayer = emapic.utils.overrideFunction(emapic.addIndivVotesLayer, null, function() {
    	if (filterProperty === null) {
    		emapic.activateExclusiveButton($('#filter-control-all'));
    	} else {
    		emapic.activateExclusiveButton($('#filter-control-' + filterProperty[1]));
    	}
    });

})(emapic);
