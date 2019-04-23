//
// Clear all filters on indiv votes layer
//

var emapic = emapic || {};

(function(emapic) {

    var clearFiltersBtnHtml = "<a id='clear-filters' title='" + emapic.utils.getI18n('js_clear_all_filters', 'Limpiar todos los filtros') + "' href='javascript:void(0)'><span class='glyphicon glyphicon-filter'></span><span class='glyphicon glyphicon-remove' style='position: absolute; top: 55%; right: 25%; font-size: .6em;'></a>";

    emapic.addViewsControls = emapic.utils.overrideFunction(emapic.addViewsControls, null, function() {
        var clearFilterControl = L.control({position: 'topleft'});
        clearFilterControl.onAdd = function (map) {
            this._div = L.DomUtil.create('div', 'clear-filters-control views-control leaflet-bar');
            this._div.innerHTML = clearFiltersBtnHtml;
            return this._div;
        };
        clearFilterControl.addTo(emapic.map);
        L.DomEvent.on(document.getElementById('clear-filters'), 'click', function() {
            if (emapic.clearFilters()) {
                emapic.updateIndivVotesLayer();
                emapic.updateIndivVotesLayerControls();
            }
        });
        emapic.utils.handleCtrlBtnEvents('.clear-filters-control a', clearFilterControl);
    });

    emapic.disableIndivLayerExclusiveComponents = emapic.utils.overrideFunction(emapic.disableIndivLayerExclusiveComponents, null, function() {
        $('.clear-filters-control').addClass('force-disable');
    });

    emapic.enableIndivLayerExclusiveComponents = emapic.utils.overrideFunction(emapic.enableIndivLayerExclusiveComponents, null, function() {
        $('.clear-filters-control').removeClass('force-disable');
    });

})(emapic);
