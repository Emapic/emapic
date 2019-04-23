//
// Filter markers by free drawing an area
//

var emapic = emapic || {};

(function(emapic) {

    var spatialFilterButtonsHtml = "<a id='spatial-filter-draw' title='" + emapic.utils.getI18n('js_add_spatial_filter', 'Dibujar filtro por área') +
        "' href='javascript:void(0)' onclick='emapic.modules.filterSpatial.toggleSpatialFilterDrawing()'><span class='glyphicon glyphicon-pencil'></span></a>" +
        "<a id='spatial-filter-remove' class='force-disable' title='" + emapic.utils.getI18n('js_remove_spatial_filter', 'Eliminar filtro por área') +
        "' href='javascript:void(0)' onclick='emapic.modules.filterSpatial.clearFilter()'><span class='glyphicon glyphicon-erase'></span></a>",
        freeDraw,
        filterTurfGeom = null,
        drawer,
        filterLayer,
        defaultPreferences;

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
            polygon: {
                color: 'green',
                weight: 3,
                fillColor: 'green',
                fillOpacity: 0.05,
                interactive: false,
                smoothFactor: 1
            },
            polyline: {
                interactive: false
            }
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

        drawer.on('layeradd', function (data) {
            processDrawnGeom(data.layer._latlngs);
            disableDrawing();
            filterLayer = data.layer;
            emapic.map.addLayer(filterLayer);
            $('#spatial-filter-remove').removeClass('force-disable');
        });

        drawer.setMode();
    });

    emapic.disableIndivLayerExclusiveComponents = emapic.utils.overrideFunction(emapic.disableIndivLayerExclusiveComponents, null, function() {
        emapic.modules.filterSpatial.stopSpatialFilterDrawing();
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

    emapic.modules.filterSpatial.toggleSpatialFilterDrawing = function() {
        if (emapic.map.hasLayer(drawer)) {
            disableDrawing();
        } else {
            enableDrawing();
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
    }

    function enableDrawing() {
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
        $(emapic.map.getContainer()).addClass('mode-drawing');
    }

    function processDrawnGeom(latLngs) {
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
                coords.push(innerCoords);
            }
            filterTurfGeom = turf.polygon(coords);
            emapic.applyFilters();
        }
    }

})(emapic);
