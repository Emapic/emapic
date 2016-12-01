//
// Emapic remote loading through API code
//

var emapic = emapic || {};

(function(emapic) {

    var maps = {},
        emapicServer = (function() {
        var scripts = document.getElementsByTagName("script"),
            fullPath = scripts[scripts.length-1].src,
            parser = document.createElement('a');
        // Workaround for a strange bug in Firefox where
        // after following a link it returns all the script tags
        // instead of only the already loaded ones
        if (!(fullPath.endsWith('emapic_remote_loading.js'))) {
            fullPath = '';
            for (var i = 0, len = scripts.length; i<len; i++) {
                if (scripts[i].src.endsWith('emapic_remote_loading.js')) {
                    fullPath = scripts[i].src;
                    break;
                }
            }
        }
        parser.href = fullPath;
        return parser.origin;
    })();

    emapic.dependencies = emapic.dependencies || [];

    emapic.leafletDep = emapic.leafletDep || function() {
        var leaflet = $.Deferred();
        if (typeof L === 'undefined') {
            $('head').append( $('<link rel="stylesheet" type="text/css" />').attr('href', 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/leaflet.css') );
            $.getScript("https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/leaflet.js", function() {
                leaflet.resolve(true);
            });
        } else {
            leaflet.resolve(true);
        }
        return leaflet;
    }();

    if (!(emapic.leafletDep in emapic.dependencies)) {
        emapic.dependencies.push(emapic.leafletDep);
    }

    emapic.callbacks = [];

    function loadIndivLayer(map, layer, userLogin, locationGroupId) {
        emapic.callbacks.push(function(data) {
            addLayerData(map, layer, data);
        });
        $.getScript(emapicServer + "/api/locationgroup/" + userLogin + "/" + locationGroupId + "?callback=emapic.callbacks[" + (emapic.callbacks.length - 1) + "]");
    }

    function reloadIndivLayer(map, layer, userLogin, locationGroupId) {
        layer.clearLayers();
        loadIndivLayer(map, layer, userLogin, locationGroupId);
    }

    function loadBarriosLayer(map, layer, userLogin, locationGroupId) {
        emapic.callbacks.push(function(data) {
            addLayerData(map, layer, data);
        });
        $.getScript(emapicServer + "/api/locationgroup/" + userLogin + "/" + locationGroupId + "/totals/madrid_barrios?callback=emapic.callbacks[" + (emapic.callbacks.length - 1) + "]");
    }

    function reloadBarriosLayer(map, layer, userLogin, locationGroupId) {
        layer.clearLayers();
        loadBarriosLayer(map, layer, userLogin, locationGroupId);
    }

    function loadDistritosLayer(map, layer, userLogin, locationGroupId) {
        emapic.callbacks.push(function(data) {
            addLayerData(map, layer, data);
        });
        $.getScript(emapicServer + "/api/locationgroup/" + userLogin + "/" + locationGroupId + "/totals/madrid_distritos?callback=emapic.callbacks[" + (emapic.callbacks.length - 1) + "]");
    }

    function reloadDistritosLayer(map, layer, userLogin, locationGroupId) {
        layer.clearLayers();
        loadDistritosLayer(map, layer, userLogin, locationGroupId);
    }

    function addLayerData(map, layer, data) {
        if (data.status != 'error') {
          layer.addData(data);
          if (layer.getLayers().length !== 0) {
            $(map.getContainer()).show();
            map.fitBounds(layer.getBounds(),
            {
                padding: [10, 10]
            });
          }
        }
    }

    emapic.loadEmapicMapsLoadDependencies = function() {
        var leaflet = $.Deferred();

        if (typeof L === 'undefined') {
            $('head').append( $('<link rel="stylesheet" type="text/css" />').attr('href', 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/leaflet.css') );
            $.getScript("https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/leaflet.js");
        } else {
            leaflet.resolve(true);
        }

        return $.when( leaflet );
    };

    emapic.loadEmapicMaps = function() {
        $('.emapic-map.location-group').each(function(idx) {
            var $map = $(this),
                userLogin = $map.attr('emapic-login'),
                mapId = $map.attr('id'),
                locationGroupId = $map.attr('emapic-location-group-id');
            if (userLogin !== null && locationGroupId !== null) {
                var osmMap = L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'),
                    landMap = L.tileLayer('http://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'),
                    indivLayer = L.geoJson(),
                    barriosLayer = L.geoJson(),
                    distritosLayer = L.geoJson(),
                    map = L.map(this, {
                      layers: [osmMap, indivLayer],
                      scrollWheelZoom: false,
                      maxZoom: 18,
                      minZoom: 8
                    });
                L.control.layers({
                    "OSM Mapnik": osmMap,
                    "Landscape": landMap
                }, {
                    "Individuales": indivLayer,
                    "Barrios": barriosLayer,
                    "Distritos": distritosLayer,
                }).addTo(map);
                $(map.getContainer()).show();
                map.setView([40.4167, -3.7037], 13);
                loadIndivLayer(map, indivLayer, userLogin, locationGroupId);
                loadBarriosLayer(map, barriosLayer, userLogin, locationGroupId);
                loadDistritosLayer(map, distritosLayer, userLogin, locationGroupId);
                if (mapId !== null) {
                    maps[mapId] = {
                        'map' : map,
                        'indivLayer': indivLayer,
                        'barriosLayer': barriosLayer,
                        'distritosLayer': distritosLayer
                    };
                }
            }
        });
    };

    emapic.reloadEmapicMap = function(mapId) {
        if (mapId in maps) {
            var map = maps[mapId].map,
                indivLayer = maps[mapId].indivLayer,
                barriosLayer = maps[mapId].barriosLayer,
                distritosLayer = maps[mapId].distritosLayer,
                $map = $(map.getContainer()),
                userLogin = $map.attr('emapic-login'),
                locationGroupId = $map.attr('emapic-location-group-id');
            if (userLogin !== null && locationGroupId !== null) {
                reloadIndivLayer(map, indivLayer, userLogin, locationGroupId);
                reloadBarriosLayer(map, barriosLayer, userLogin, locationGroupId);
                reloadDistritosLayer(map, distritosLayer, userLogin, locationGroupId);
            }
        }
    };

    emapic.reloadAllEmapicMaps = function() {
        for (var mapId in maps) {
            var map = maps[mapId].map,
                indivLayer = maps[mapId].indivLayer,
                barriosLayer = maps[mapId].barriosLayer,
                distritosLayer = maps[mapId].distritosLayer,
                $map = $(map.getContainer()),
                userLogin = $map.attr('emapic-login'),
                locationGroupId = $map.attr('emapic-location-group-id');
            if (userLogin !== null && locationGroupId !== null) {
                reloadIndivLayer(map, indivLayer, userLogin, locationGroupId);
                reloadBarriosLayer(map, barriosLayer, userLogin, locationGroupId);
                reloadDistritosLayer(map, distritosLayer, userLogin, locationGroupId);
            }
        }
    };
})(emapic);

$(function() {
    $.when.apply($, emapic.dependencies).then(emapic.loadEmapicMaps);
});
