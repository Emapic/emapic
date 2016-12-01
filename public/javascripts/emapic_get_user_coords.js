//
// Emapic remote locating through API code
//

var emapic = emapic || {};

(function(emapic) {

    var emapicServer = (function() {
        var scripts = document.getElementsByTagName("script"),
            fullPath = scripts[scripts.length-1].src,
            parser = document.createElement('a');
        // Workaround for a strange bug in Firefox where
        // after following a link it returns all the script tags
        // instead of only the already loaded ones
        if (!(fullPath.endsWith('emapic_get_user_coords.js'))) {
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
    emapic.blockBtn = true;
    emapic.userLocationMap = null;

    emapic.leafletDep = emapic.leafletDep || function() {
        var defer = $.Deferred();
        if (typeof L === 'undefined') {
            $('head').append( $('<link rel="stylesheet" type="text/css" />').attr('href', 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/leaflet.css') );
            $.getScript("https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/leaflet.js", function() {
                defer.resolve(true);
            });
        } else {
            defer.resolve(true);
        }
        return defer;
    }();

    if (!(emapic.leafletDep in emapic.dependencies)) {
        emapic.dependencies.push(emapic.leafletDep);
    }

    emapic.jqueryModalDep = emapic.jqueryModalDep || function() {
        var defer = $.Deferred();
        if (typeof $.modal === 'undefined') {
            $('head').append( $('<link rel="stylesheet" type="text/css" />').attr('href', 'https://cdnjs.cloudflare.com/ajax/libs/jquery-modal/0.8.0/jquery.modal.min.css') );
            $.getScript("https://cdnjs.cloudflare.com/ajax/libs/jquery-modal/0.8.0/jquery.modal.min.js", function() {
                defer.resolve(true);
            });
        } else {
            defer.resolve(true);
        }
        return defer;
    }();

    if (!(emapic.jqueryModalDep in emapic.dependencies)) {
        emapic.dependencies.push(emapic.jqueryModalDep);
    }

    emapic.emapicUtilsDep = emapic.emapicUtilsDep || function() {
        var defer = $.Deferred();
        $.getScript(emapicServer + "/javascripts/emapic_utils.js", function() {
            defer.resolve(true);
        });
        return defer;
    }();

    if (!(emapic.emapicUtilsDep in emapic.dependencies)) {
        emapic.dependencies.push(emapic.emapicUtilsDep);
    }

    emapic.emapicGeoapiDep = emapic.emapicGeoapiDep || function() {
        var defer = $.Deferred();
        $.getScript(emapicServer + "/javascripts/geoapi.js", function() {
            defer.resolve(true);
        });
        return defer;
    }();

    if (!(emapic.emapicGeoapiDep in emapic.dependencies)) {
        emapic.dependencies.push(emapic.emapicGeoapiDep);
    }

    $.when(emapic.emapicGeoapiDep).then(function() {
        emapic.geoapi.afterGeopos = function() {
            var position = [emapic.geoapi.geoapiLat, emapic.geoapi.geoapiLon];
            emapic.setMarker(position);
            emapic.userLocationMap.setView(position, 17);
        };
    });

    emapic.btnSelector = null;

    emapic.processUserLatLng = function(lat, lng)  {
    };

    emapic.prepareEmapicGetUserCoordsSupport = function() {
        $('head').append('<style>\
            #emapic-user-location #geolocation-control {\
                padding: 0 4px;\
                width: inherit;\
            }\
            #emapic-user-location {\
                width: 100%;\
                height: 300px;\
                margin-bottom: 10px;\
            }\
            #user-location-btns {\
                text-align: center;\
            }\
            #user-location-btns > a {\
                margin-bottom: 0;\
            }\
            #user-location-ok {\
                margin-right: 25px;\
            }\
        </style>');

        $('body').append('<div id="user-location" class="modal" style="display: none;">\
            <div id="emapic-user-location"></div>\
            <div id="user-location-btns">\
                <a id="user-location-ok" disabled class="button" href="#">Aceptar</a>\
                <a id="user-location-cancel" class="button" href="#" rel="modal:close">No quiero compartir mi posición</a>\
            </div>\
        </div>');

        $('#user-location').on($.modal.AFTER_CLOSE, function(event, modal) {
            emapic.blockBtn = false;
            $(emapic.btnSelector).click();
        });
        $('#user-location').on($.modal.OPEN, function(event, modal) {
            if (emapic.userLocationMap === null) {
                initializeMap();
                emapic.userLocationMap.setMaxBounds([
                    [40.3120635139465, -3.8888731210955],
                    [40.6433053051368, -3.51823840469513]
                ]);
                emapic.userLocationMap.options.minZoom = 10;
                emapic.userLocationMap.fitBounds([
                    [40.3120635139465, -3.8888731210955],
                    [40.6433053051368, -3.51823840469513]
                ]);
            }
        });
        $('#user-location-ok').click(function(event) {
            if (userLocationMarker !== null) {
                var latLng = userLocationMarker.getLatLng();
                emapic.processUserLatLng(latLng.lat, latLng.lng);
            }
            $.modal.close();
        });
        $(emapic.btnSelector).click(function(event) {
            if (emapic.blockBtn) {
                $('#user-location').modal({
                  escapeClose: false,
                  clickClose: false,
                  showClose: false
                });
                return false;
            } else {
                return true;
            }
        });

        var userLocationMarker = null;

        emapic.setMarker = function(position) {
            $('#update-position-btn').prop('disabled', false);
            if (userLocationMarker === null) {
                userLocationMarker = L.marker(position);
                emapic.userLocationMap.addLayer(userLocationMarker);
                userLocationMarker.dragging.enable();
            } else {
                userLocationMarker.setLatLng(position);
            }
            $("#user-location-ok").attr('disabled', false);
        };

        function initializeMap() {
            var osmUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
            var osmAttrib = 'Map data © <a href="http://openstreetmap.org">OpenStreetMap</a> contributors';
            var osm = new L.TileLayer(osmUrl, {
                minZoom : 1,
                maxZoom : 18,
                attribution : osmAttrib
            });

            emapic.userLocationMap = L.map('emapic-user-location', {
                attributionControl: false,
                zoomControl: false
            });
            emapic.userLocationMap.addControl(L.control.zoom({
                zoomInTitle: emapic.utils.getI18n('js_zoom_in', 'Zoom más'),
                zoomOutTitle: emapic.utils.getI18n('js_zoom_out', 'Zoom menos'),
            }));
            emapic.userLocationMap.addControl(L.control.attribution({
                prefix: '<a href="/legal/terms" title="' + emapic.utils.getI18n('js_open_legal_terms_another_tab', 'Abrir cláusulas legales en otra pestaña') + '" target="_blank">' + emapic.utils.getI18n('js_emapic_legal_terms', 'Cláusulas legales de emapic') + '</a> | <a title="A JS library for interactive maps" href="http://leafletjs.com">Leaflet</a>'
            }));
            var geolocationControl = L.control({position: 'topright'});
            geolocationControl.onAdd = function () {
                this._div = L.DomUtil.create('div', 'views-control leaflet-bar');
                this._div.innerHTML = "<a id='geolocation-control' class='text-button' title=\"" + emapic.utils.getI18n('js_geolocate', 'Geolocalizar automáticamente tu posición actual') + "\" href='#' onclick='emapic.geoapi.getApiLocation();'>" + emapic.utils.getI18n('js_geolocate_text', 'Geolocalizar') + "</a>";
                return this._div;
            };
            geolocationControl.addTo(emapic.userLocationMap);
            emapic.utils.disableDefaultClickEvents($('#geolocation-control')[0]);

            emapic.userLocationMap.setMaxBounds(
                L.latLngBounds(
                    L.latLng(85, -180),
                    L.latLng(-85, 180)
                )
            );
            emapic.userLocationMap.fitBounds(
                L.latLngBounds(
                    L.latLng(70, -160),
                    L.latLng(-70, 160)
                )
            );
            emapic.userLocationMap.addLayer(osm);

            emapic.userLocationMap.on('click', function(e) {
                emapic.setMarker(e.latlng);
            });
        }
    };
})(emapic);

$(function() {
    if (emapic.btnSelector !== null) {
        $.when.apply($, emapic.dependencies).then(function() {
            emapic.prepareEmapicGetUserCoordsSupport();
            $(emapic.btnSelector).attr('disabled', false);
        });
    }
});
