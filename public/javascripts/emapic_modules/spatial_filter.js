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
        oldLayers,
        drawer,
        defaultPreferences,
        baseSimplifyTolerance = 0.00001,
        filterStyle = {
            color: 'green',
            weight: 3,
            fillColor: 'green',
            fillOpacity: 0.05,
            interactive: false,
            smoothFactor: 1
        },
        tooltip = L.tooltip({
          position: 'right',
          className: 'tooltip draw-tooltip',
          noWrap: false
      }).setContent(emapic.utils.getI18n('js_draw_spatial_filter_tooltip', 'Pulsa y arrastra para añadir áreas, luego pulsa en «Terminar»'));

    emapic.modules = emapic.modules || {};
    emapic.modules.filterSpatial = emapic.modules.filterSpatial || {};

    emapic.modules.filterSpatial.filter = new emapic.Filter({
        applyFilter: function(feature) {
            return filterTurfGeom ? turf.inside(feature, filterTurfGeom) : true;
        },
        clearFilter: function() {
            filterTurfGeom = null;
            drawer.clearLayers();
        },
        isFilterActive: function() {
            return filterTurfGeom !== null;
        },
        getExportParameters: function() {
            var params = [];
            if (filterTurfGeom !== null) {
                params.push('filter_geom=' + encodeURIComponent(JSON.stringify(filterTurfGeom.geometry)));
            }
            return params;
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
            polyline: filterStyle,
            simplify_tolerance: baseSimplifyTolerance
        });

        // Workaround to prevent a freehandshapes bug that results in annoying
        // null pointer exceptions and other problems when the cursor goes outside
        // the map and the drawing layer isn't displayed
        drawer._mouseUpLeave = drawer.mouseUpLeave;
        drawer.mouseUpLeave = function() {
            if (this.mode !== 'view') {
                this._mouseUpLeave();
            }
        };

        drawer.setMode();
        emapic.map.addLayer(drawer);
    });

    emapic.disableIndivLayerExclusiveComponents = emapic.utils.overrideFunction(emapic.disableIndivLayerExclusiveComponents, null, function() {
        emapic.modules.filterSpatial.stopSpatialFilterDrawing(true);
        var layers = drawer.getLayers();
        for (var i = 0, iLen = layers.length; i<iLen; i++) {
            layers[i].getElement().style.display = 'none';
        }
        $('#spatial-filter-remove').removeClass('force-disable');
        $('.spatial-filter-control').addClass('force-disable');
    });

    emapic.enableIndivLayerExclusiveComponents = emapic.utils.overrideFunction(emapic.enableIndivLayerExclusiveComponents, null, function() {
        var layers = drawer.getLayers();
        for (var i = 0, iLen = layers.length; i<iLen; i++) {
            layers[i].getElement().style.display = 'inherit';
        }
        if (!filterTurfGeom) {
            $('#spatial-filter-remove').addClass('force-disable');
        }
        $('.spatial-filter-control').removeClass('force-disable');
    });

    emapic.modules.filterSpatial.startSpatialFilterDrawing = function() {
        if (drawer.mode !== 'add') {
            oldFilterTurfGeom = filterTurfGeom;
            oldLayers = drawer.getLayers();
            enableDrawing();
        }
    };

    emapic.modules.filterSpatial.stopSpatialFilterDrawing = function(revert) {
        if (drawer.mode === 'add') {
            if (!revert) {
                processDrawnGeom();
            }
            disableDrawing();
            if (revert) {
                drawer.clearLayers();
                if (oldFilterTurfGeom && oldLayers) {
                    for (var i = 0, iLen = oldLayers.length; i<iLen; i++) {
                        drawer.addLayer(oldLayers[i]);
                    }
                    filterTurfGeom = oldFilterTurfGeom;
                }
            }
            if (filterTurfGeom) {
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
        emapic.map.off('zoomend', updateSimplifyTolerance);
        try {
            $('#spatial-filter-draw').tooltip('enable');
        } catch (err) {
            // Ignore it
        }
        emapic.deactivateButton($('#spatial-filter-draw'));
        $(emapic.map.getContainer()).removeClass('mode-drawing');
        removeTooltip();
        if (defaultPreferences && defaultPreferences.dragging && !emapic.map.dragging._enabled) {
            emapic.map.dragging.enable();
        }
        if (defaultPreferences && defaultPreferences.doubleClickZoom && !emapic.map.doubleClickZoom._enabled) {
            emapic.map.doubleClickZoom.enable();
        }
        if (defaultPreferences && defaultPreferences.scrollWheelZoom && !emapic.map.scrollWheelZoom._enabled) {
            emapic.map.scrollWheelZoom.enable();
        }
        $('.spatial-filter-control .leaflet-button-actions').hide();
    }

    function updateSimplifyTolerance() {
        drawer.options.simplify_tolerance = baseSimplifyTolerance * Math.pow(2, 18 - emapic.map.getZoom());
    }

    function enableDrawing() {
        $('.spatial-filter-control .leaflet-button-actions').show();
        defaultPreferences = {
            dragging: emapic.map.dragging._enabled,
            doubleClickZoom: emapic.map.doubleClickZoom._enabled,
            scrollWheelZoom: emapic.map.scrollWheelZoom._enabled
        };

        if (emapic.modules.filterSpatial.filter.isFilterActive()) {
            filterTurfGeom = null;
            emapic.applyFilters();
            $('#spatial-filter-remove').addClass('force-disable');
        }
        updateSimplifyTolerance();
        emapic.map.on('zoomend', updateSimplifyTolerance);
        drawer.setMode('add');
        emapic.activateButton($('#spatial-filter-draw'));
        try {
            $('#spatial-filter-draw').tooltip('hide');
            $('#spatial-filter-draw').tooltip('disable');
        } catch (err) {
            // Ignore it
        }
        addTooltip();
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
        }
    }

    function updateTooltipLocation(evt) {
        tooltip.updatePosition(evt.layerPoint);
    }

    function addTooltip() {
        var bounds = emapic.map.getBounds();
        // Initialize the tooltip vertically centered, at 25% screen width from left
        tooltip.setLatLng([(bounds._southWest.lat + bounds._northEast.lat) / 2,
          bounds._southWest.lng + (bounds._northEast.lng - bounds._southWest.lng) / 4]).addTo(emapic.map);

        emapic.map.on('mousemove', updateTooltipLocation);
        emapic.map.on('mousedown touchstart', removeTooltip);
    }

    function removeTooltip() {
        emapic.map.off('mousemove', updateTooltipLocation);

        tooltip.removeFrom(emapic.map);
    }

})(emapic);
