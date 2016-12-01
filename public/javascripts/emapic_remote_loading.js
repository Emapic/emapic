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
    emapic.loadDataMap = null;
    emapic.loadDataIndivLayer = null;
    emapic.loadDataIndivLayerCluster = null;
    emapic.loadDataBarriosLayer = null;
    emapic.loadDataDistritosLayer = null;
    emapic.legendBarrios = null;
    emapic.legendDistritos = null;

    emapic.leafletDep = emapic.leafletDep || function() {
        var deferred = $.Deferred();
        if (typeof L === 'undefined') {
            $('head').append( $('<link rel="stylesheet" type="text/css" />').attr('href', 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/leaflet.css') );
            $.getScript("https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/leaflet.js", function() {
                deferred.resolve(true);
            });
        } else {
            deferred.resolve(true);
        }
        return deferred;
    }();

    if (!(emapic.leafletDep in emapic.dependencies)) {
        emapic.dependencies.push(emapic.leafletDep);
    }

    emapic.leafletMarkerCluster = emapic.leafletMarkerCluster || function() {
        var deferred = $.Deferred();
        $.when(emapic.leafletDep).then(function() {
            $('head').append( $('<link rel="stylesheet" type="text/css" />').attr('href', 'https://cdnjs.cloudflare.com/ajax/libs/leaflet.markercluster/0.5.0/MarkerCluster.css') );
            $('head').append( $('<link rel="stylesheet" type="text/css" />').attr('href', 'https://cdnjs.cloudflare.com/ajax/libs/leaflet.markercluster/0.5.0/MarkerCluster.Default.css') );
            $.getScript("https://cdnjs.cloudflare.com/ajax/libs/leaflet.markercluster/0.5.0/leaflet.markercluster.js", function() {
                deferred.resolve(true);
            });
        });
        return deferred;
    }();

    if (!(emapic.leafletMarkerCluster in emapic.dependencies)) {
        emapic.dependencies.push(emapic.leafletMarkerCluster);
    }

    emapic.leafletGroupedLayer = emapic.leafletGroupedLayer || function() {
        var deferred = $.Deferred();
        $.when(emapic.leafletDep).then(function() {
            $.getScript("https://cdn.jsdelivr.net/leaflet.groupedlayercontrol/0.5.0/leaflet.groupedlayercontrol.min.js", function() {
                deferred.resolve(true);
            });
        });
        return deferred;
    }();

    if (!(emapic.leafletGroupedLayer in emapic.dependencies)) {
        emapic.dependencies.push(emapic.leafletGroupedLayer);
    }

    emapic.d3Dep = emapic.d3Dep || function() {
        var deferred = $.Deferred();
        if (typeof d3 === 'undefined') {
            $.getScript("https://d3js.org/d3.v4.min.js", function() {
                deferred.resolve(true);
            });
        } else {
            deferred.resolve(true);
        }
        return deferred;
    }();

    if (!(emapic.d3Dep in emapic.dependencies)) {
        emapic.dependencies.push(emapic.d3Dep);
    }

    emapic.callbacks = [];

    function loadIndivLayer(map, layer, userLogin, locationGroupId) {
        emapic.callbacks.push(function(data) {
            if (data.status != 'error') {
              emapic.loadDataIndivLayerCluster.addLayer(L.geoJson(data));
              if (layer.getLayers().length !== 0) {
                $(map.getContainer()).show();
                map.fitBounds(layer.getBounds(),
                {
                    padding: [10, 10]
                });
              }
            }
        });
        $.getScript(emapicServer + "/api/locationgroup/" + userLogin + "/" + locationGroupId + "?callback=emapic.callbacks[" + (emapic.callbacks.length - 1) + "]");
    }

    function reloadIndivLayer(map, layer, userLogin, locationGroupId) {
        layer.clearLayers();
        loadIndivLayer(map, layer, userLogin, locationGroupId);
    }

    function loadBarriosLayer(map, layer, userLogin, locationGroupId) {
        emapic.callbacks.push(function(data) {
          if (data.features && data.features.length > 0) {

          	data.features.forEach(function(d){
              var valor = (d.properties.total_locations / d.properties.population)*100;
          		d.properties.valor = valor.toFixed(2);
          	});

            var colorScaleBarrios = d3.scaleQuantize().domain([0,100]).range(colorRange);

            layer.addData(data).eachLayer(function(layer) {
              layer.bindPopup(featurePopupContent(layer));
              layer.setStyle(styleLayer(layer, colorScaleBarrios));
            });
            addLegend(emapic.legendBarrios, colorScaleBarrios);
            $(map.getContainer()).show();
            map.fitBounds(layer.getBounds(),
            {
               padding: [10, 10]
            });
            map.addControl(emapic.legendBarrios);
          }
        });
        $.getScript(emapicServer + "/api/locationgroup/" + userLogin + "/" + locationGroupId + "/totals/madrid_barrios?callback=emapic.callbacks[" + (emapic.callbacks.length - 1) + "]");
    }

    function reloadBarriosLayer(map, layer, userLogin, locationGroupId) {
        layer.clearLayers();
        loadBarriosLayer(map, layer, userLogin, locationGroupId);
    }

    function loadDistritosLayer(map, layer, userLogin, locationGroupId) {
        emapic.callbacks.push(function(data) {
          if (data.features && data.features.length > 0) {

          	data.features.forEach(function(d){
              var valor = (d.properties.total_locations / d.properties.population)*100;
          		d.properties.valor = valor.toFixed(2);
          	});

            var colorScaleDistritos = d3.scaleQuantize().domain([0,100]).range(colorRange);

            layer.addData(data).eachLayer(function(layer) {
              layer.bindPopup(featurePopupContent(layer));
              layer.setStyle(styleLayer(layer, colorScaleDistritos));
            });
            addLegend(emapic.legendDistritos, colorScaleDistritos);
            $(map.getContainer()).show();
            map.fitBounds(layer.getBounds(),
            {
               padding: [10, 10]
            });
          }
        });
        $.getScript(emapicServer + "/api/locationgroup/" + userLogin + "/" + locationGroupId + "/totals/madrid_distritos?callback=emapic.callbacks[" + (emapic.callbacks.length - 1) + "]");
    }

    function reloadDistritosLayer(map, layer, userLogin, locationGroupId) {
        layer.clearLayers();
        loadDistritosLayer(map, layer, userLogin, locationGroupId);
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

    var colorRange = [
        "#E51800",
        "#E74A00",
        "#EA7C01",
        "#EDAF01",
        "#F0E302",
        "#CDF203",
        "#9CF503",
        "#6BF804",
        "#39FB05",
        "#07FE05"
    ];

    function detectMobile() {
      if( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ) {
        return true;
      } else {
        return false;
      }
    }

    var isMobile = detectMobile();

    var formatNumber = function(numero) {
        var es_ES = {
            "decimal": ",",
            "thousands": ".",
            "grouping": [3],
            "currency": ["€", ""],
            "dateTime": "%a %b %e %X %Y",
            "date": "%d/%m/%Y",
            "time": "%H:%M:%S",
            "periods": ["AM", "PM"],
            "days": ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"],
            "shortDays": ["Dom", "Lun", "Mar", "Mi", "Jue", "Vie", "Sab"],
            "months": ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"],
            "shortMonths": ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
        };

        var locale = d3.formatDefaultLocale(es_ES),
          formato = locale.format(",.1f");

        return formato(numero).replace(',0','');
    };



    function featurePopupContent(data) {
        return  '<h4 style="margin-bottom: 0px;margin-top: 0px;">'
        +  data.feature.properties.name
        + '</h4>'
        + '<hr/>'
        + '<h5>'
        + 'Apoyos: '
        + formatNumber(data.feature.properties.total_locations)
        + '</h5><h5>'
        + 'Población: '
        + formatNumber(data.feature.properties.population)
        + '</h5>'
        + '<hr/>'
        + '<h5> Aprobación (*): '
        + formatNumber(data.feature.properties.valor) + ' %'
        + '</h5>';
    }

    function styleLayer(layer,colorScale) {
      return {
          weight:1,
          opacity: 1,
          color: 'grey',
          fillOpacity: 0.7,
          fillColor: colorScale((layer.feature.properties.total_locations/layer.feature.properties.population)*100)
      };
    }


    function addLegend(controlLegend, colorScale) {
      var grades,
          close_text = '';

      if(isMobile) {
        grades = [0,30,60,100];
      } else {
        grades = [0, 10, 20 ,30, 40, 50, 60, 70, 80, 90, 100];
      }

      controlLegend.onAdd = function (map) {
        var div = L.DomUtil.create('div', 'legend'),
            labels = [],
            from,
            to;

        for (var i = 0; i < grades.length; i++) {
          from = grades[i];
          to = grades[i + 1];

          if (to) {
            labels.push(
              '<i style="background:' + colorScale(from) + ' "></i>' + from + (to ? '&ndash;' + to + ' %' : '')
            );
          }
        }

        div.innerHTML = '<div class="info"' + (isMobile ? ' style="display:none;"' : '') +'">'
        + '<h5>% de Aprobación&nbsp;&nbsp;&nbsp;'
        + '<span class="legend-close-btn">&times;</span>'
        + '</h5><hr/>'+labels.join('<br>')
        + '</div>'
        + '<div class="btn legend-open-btn"'  + (isMobile ?  '' : ' style="display:none;"') + '>&raquo;</div>';
        return div;
      }
    }

    emapic.loadEmapicMaps = function() {
        emapic.legendBarrios = L.control({position: 'bottomleft'});
        emapic.legendDistritos = L.control({position: 'bottomleft'});
        emapic.loadDataIndivLayerCluster = L.markerClusterGroup({
          showCoverageOnHover: false,
          spiderfyOnMaxZoom: true,
          removeOutsideVisibleBounds: true
        });
        $('head').append('<style>\
            .leaflet-control form label {\
                font-size: 12px;\
                vertical-align:bottom;\
            }\
            .leaflet-control form input,\
            .leaflet-control form input[type="radio"],\
            .leaflet-control form input[type="checkbox"] {\
              height:15px;\
              margin:0px;\
            }\
            .leaflet-container hr { margin:5px 0px 15px; }\
            .legend .info {\
              padding: 6px 8px;\
              font-size: 14px;\
              background: rgba(255,255,255,0.8);\
              box-shadow: 0 0 15px rgba(0,0,0,0.4);\
              border-radius: 5px;\
            }\
            .legend .btn {\
              padding: 5px 7px 7px 9px;\
              font-size: 32px;\
              background: rgba(255,255,255,0.9);\
              box-shadow: 0 0 15px rgba(0,0,0,0.4);\
              border-radius: 5px;\
              width:36px;\
              height:36px;\
              float:right;\
              text-align:center;\
            }\
            .info h4 {\
              margin:0;\
              color: #777;\
            }\
            .legend {\
              text-align: left;\
              line-height: 22px;\
              color: #555;\
            }\
            .legend i {\
              width: 18px;\
              height: 18px;\
              float: left;\
              margin-right: 8px;\
              opacity: 0.7;\
            }\
            .legend-close-btn{\
              font-size: 20px;\
              cursor: pointer;\
            }\
            .hide { display:none; }\
        </style>');
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
                      layers: [osmMap, emapic.loadDataIndivLayerCluster, barriosLayer],
                      scrollWheelZoom: false,
                      maxZoom: 18,
                      minZoom: 8
                    }),
                    baseLayers = {
                      "OSM Mapnik": osmMap,
                      "Landscape": landMap
                    },
                    groupedOverlays = {
                    '': {
                      'Apoyos': emapic.loadDataIndivLayerCluster,
                    },
                    'Zonas': {
                      'Barrios': barriosLayer,
                      'Distritos': distritosLayer,
                      'Ninguna': L.layerGroup()
                    }
                };

                var options = {
                    // Make the "Landmarks" group exclusive (use radio inputs)
                    exclusiveGroups: ['Zonas'],
                };

                L.control.groupedLayers(baseLayers, groupedOverlays, options).addTo(map);
                $(map.getContainer()).show();
                // Show/hide legends
                map.on('layerremove', function(e) {
                  if (e.layer == emapic.loadDataBarriosLayer) {
                    map.removeControl(emapic.legendBarrios);
                  } else if (e.layer == emapic.loadDataDistritosLayer) {
                    map.removeControl(emapic.legendDistritos);
                  }
                });

                map.on('layeradd', function(e) {
                 if (e.layer == emapic.loadDataBarriosLayer) {
                   map.addControl(emapic.legendBarrios);
                 } else if (e.layer == emapic.loadDataDistritosLayer) {
                   map.addControl(emapic.legendDistritos);
                 }
                });
                map.setView([40.4167, -3.7037], 13);
                emapic.loadDataIndivLayer = indivLayer;
                emapic.loadDataBarriosLayer = barriosLayer;
                emapic.loadDataDistritosLayer = distritosLayer;
                emapic.loadDataMap = map;
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
        // Hide legend
        $(document).on('click','.legend-close-btn',function(e) {
            var legend = $(this).parents('.legend');
            legend.find('.info').css('display','none');
            legend.find('.btn').css('display','block');
        });

        // Open legend
        $(document).on('click','.legend-open-btn',function(e) {
            var legend = $(this).parents('.legend');
            legend.find('.btn').css('display','none');
            legend.find('.info').css('display','block');
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
