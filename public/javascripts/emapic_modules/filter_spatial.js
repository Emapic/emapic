//
// Filter markers by free drawing an area
//

var emapic = emapic || {};

(function(emapic) {

    var spatialFilterButtonsHtml = "<a id='spatial-filter-draw' title='" + emapic.utils.getI18n('js_add_spatial_filter', 'Dibujar filtro por área') +
        "' href='javascript:void(0)' onclick='emapic.modules.filterSpatial.startSpatialFilterDrawing()'><span class='glyphicon glyphicon-pencil'></span></a>" +
        "<ul class='leaflet-button-actions' style='top: 0px;'><li><a href='#' title='Finish drawing' onclick='emapic.modules.filterSpatial.stopSpatialFilterDrawing(false)'>" +
        emapic.utils.getI18n('js_finish', 'Terminar') + "</a></li><li><a href='#' title='Cancel drawing' onclick='emapic.modules.filterSpatial.stopSpatialFilterDrawing(true)'>" +
        emapic.utils.getI18n('js_cancel', 'Cancelar') + "</a></li></ul><a id='spatial-filter-remove' class='force-disable' title='" +
        emapic.utils.getI18n('js_remove_spatial_filter', 'Eliminar filtro por área') +
        "' href='javascript:void(0)' onclick='emapic.modules.filterSpatial.clearFilter()'><span class='glyphicon glyphicon-erase'></span></a>",
        freeDraw,
        filterTurfGeom = null,
        oldFilterTurfGeom,
        drawer,
        filterLayer,
        oldFilterLayer,
        defaultPreferences,
        filterStyle = {
            color: 'green',
            weight: 3,
            fillColor: 'green',
            fillOpacity: 0.05,
            interactive: false,
            smoothFactor: 1
        };

    emapic.modules = emapic.modules || {};
    emapic.modules.filterSpatial = emapic.modules.filterSpatial || {};

    emapic.modules.filterSpatial.filter = new emapic.Filter({
        applyFilter: function(feature) {
            return filterTurfGeom ? turf.inside(feature, filterTurfGeom) : true;
        },
        clearFilter: function() {
            filterTurfGeom = null;
            if (filterLayer) {
                emapic.map.removeLayer(filterLayer);
            }
            filterLayer = null;
        },
        isFilterActive: function() {
            return filterTurfGeom !== null;
        }
    });

    emapic.addFilter(emapic.modules.filterSpatial.filter);

    emapic.addViewsControls = emapic.utils.overrideFunction(emapic.addViewsControls, null, function() {
        var spatialFilterControl = L.control({position: 'topleft'});
        spatialFilterControl.onAdd = function (map) {
            this._div = L.DomUtil.create('div', 'spatial-filter-control views-control leaflet-bar');
            this._div.innerHTML = spatialFilterButtonsHtml;
            return this._div;
        };
        spatialFilterControl.addTo(emapic.map);
        emapic.utils.handleCtrlBtnEvents('.spatial-filter-control a', spatialFilterControl);
        drawer = new L.FreeHandShapes({
            polygon: filterStyle,
            polyline: filterStyle
        });

        // Workaround to prevent a freehandshapes bug that results in annoying
        // null pointer exceptions when the cursor goes outside the map and the
        // drawing layer isn't displayed
        drawer._stopDraw = drawer.stopDraw;
        drawer.stopDraw = function() {
            if (this._map) {
                this._stopDraw();
            }
        };

        drawer.setMode();
    });

    emapic.disableIndivLayerExclusiveComponents = emapic.utils.overrideFunction(emapic.disableIndivLayerExclusiveComponents, null, function() {
        emapic.modules.filterSpatial.stopSpatialFilterDrawing(true);
        if (filterLayer) {
            emapic.map.removeLayer(filterLayer);
        }
        $('#spatial-filter-remove').removeClass('force-disable');
        $('.spatial-filter-control').addClass('force-disable');
    });

    emapic.enableIndivLayerExclusiveComponents = emapic.utils.overrideFunction(emapic.enableIndivLayerExclusiveComponents, null, function() {
        if (filterLayer) {
            emapic.map.addLayer(filterLayer);
        } else {
            $('#spatial-filter-remove').addClass('force-disable');
        }
        $('.spatial-filter-control').removeClass('force-disable');
    });

    emapic.modules.filterSpatial.startSpatialFilterDrawing = function() {
        if (!emapic.map.hasLayer(drawer)) {
            oldFilterTurfGeom = filterTurfGeom;
            oldFilterLayer = filterLayer;
            enableDrawing();
        }
    };

    emapic.modules.filterSpatial.stopSpatialFilterDrawing = function(revert) {
        if (emapic.map.hasLayer(drawer)) {
            if (!revert) {
                processDrawnGeom();
            }
            disableDrawing();
            if (revert && oldFilterTurfGeom && oldFilterLayer) {
                filterLayer = oldFilterLayer;
                filterTurfGeom = oldFilterTurfGeom;
                emapic.map.addLayer(filterLayer);
            }
            if (filterLayer) {
                $('#spatial-filter-remove').removeClass('force-disable');
            }
            emapic.applyFilters();
        }
    };

    emapic.modules.filterSpatial.clearFilter = function() {
        if (emapic.modules.filterSpatial.filter.isFilterActive()) {
            emapic.modules.filterSpatial.filter.clearFilter();
            emapic.applyFilters();
        }
    };

    function disableDrawing() {
        drawer.setMode();
        drawer.clearLayers();
        emapic.map.removeLayer(drawer);
        try {
            $('#spatial-filter-draw').tooltip('enable');
        } catch (err) {
            // Ignore it
        }
        emapic.deactivateButton($('#spatial-filter-draw'));
        $(emapic.map.getContainer()).removeClass('mode-drawing');
        if (defaultPreferences.dragging && !emapic.map.dragging._enabled) {
            emapic.map.dragging.enable();
        }
        if (defaultPreferences.doubleClickZoom && !emapic.map.doubleClickZoom._enabled) {
            emapic.map.doubleClickZoom.enable();
        }
        if (defaultPreferences.scrollWheelZoom && !emapic.map.scrollWheelZoom._enabled) {
            emapic.map.scrollWheelZoom.enable();
        }
        $('.spatial-filter-control .leaflet-button-actions').hide();
    }

    function enableDrawing() {
        $('.spatial-filter-control .leaflet-button-actions').show();
        defaultPreferences = {
            dragging: emapic.map.dragging._enabled,
            doubleClickZoom: emapic.map.doubleClickZoom._enabled,
            scrollWheelZoom: emapic.map.scrollWheelZoom._enabled
        };

        if (emapic.modules.filterSpatial.filter.isFilterActive()) {
            emapic.modules.filterSpatial.filter.clearFilter();
            emapic.applyFilters();
            $('#spatial-filter-remove').addClass('force-disable');
        }
        drawer._map = null;
        emapic.map.addLayer(drawer);
        drawer.setMode('add');
        emapic.activateButton($('#spatial-filter-draw'));
        try {
            $('#spatial-filter-draw').tooltip('hide');
            $('#spatial-filter-draw').tooltip('disable');
        } catch (err) {
            // Ignore it
        }
        $(emapic.map.getContainer()).addClass('mode-drawing');
    }

    function processDrawnGeom() {
        var layers = drawer.getLayers(),
            latLngs = [];
        for (var l = 0, lLen = layers.length; l<lLen; l++) {
            var layerLatlngs = layers[l].getLatLngs();
            if (layerLatlngs.length > 0) {
                latLngs.push(layerLatlngs[0]);
            }
        }
        if (latLngs.length > 0) {
            var coords = [];
            for (var i = 0, iLen = latLngs.length; i<iLen; i++) {
                var innerCoords = [];
                for (var j = 0, jLen = latLngs[i].length; j<jLen; j++) {
                    innerCoords.push([latLngs[i][j].lng, latLngs[i][j].lat]);
                }
                if (innerCoords.length > 0) {
                    innerCoords.push(innerCoords[0]);
                }
                coords.push([innerCoords]);
            }
            filterTurfGeom = turf.multiPolygon(coords);
            filterLayer = L.polygon(latLngs, filterStyle);
            emapic.map.addLayer(filterLayer);
        }
    }

})(emapic);
