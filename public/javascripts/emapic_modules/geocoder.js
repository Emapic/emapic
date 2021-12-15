//
// Emapic geocoder
//

var emapic = emapic || {};

(function(emapic) {

    emapic.modules = emapic.modules || {};
    emapic.modules.geocoder = emapic.modules.geocoder || {};
    emapic.modules.geocoder.addOnLoad = true;
    emapic.modules.geocoder.control = null;
    emapic.modules.geocoder.instantZoom = false;
    emapic.modules.geocoder.neverZoomToCountry = emapic.modules.geocoder.neverZoomToProvince = false;
    emapic.modules.geocoder.autoUpdateWithResponseMarker = false;

    var dontZoomToCountryOnce = false,
        dontZoomToProvinceOnce = false,
        geocoderParams = {},
        geocoderModalControl = null;

    if (emapic.utils.nominatimEmail !== null) {
        geocoderParams.email = emapic.utils.nominatimEmail;
    }

    emapic.modules.geocoder.searchLocation = function(location) {
        $('div.leaflet-control-geocoder .leaflet-control-geocoder-form input').val(location);
        $('div.leaflet-control-geocoder .leaflet-control-geocoder-form button').click();
    };

    function fitBoundsWhenOutside(bbox) {
        if (!L.latLngBounds(bbox).contains(emapic.map.getBounds())) {
            if (emapic.modules.geocoder.instantZoom) {
                emapic.map.fitBounds(bbox);
            } else {
                emapic.map.flyToBounds(bbox, {duration: 1.5});
            }
        }
    }

    function showModal() {
        switch(emapic.modules.geocoder.control.options.position) {
            case 'topleft':
                controlLocation = '.leaflet-top.leaflet-left';
                break;
            case 'bottomleft':
                controlLocation = '.leaflet-bottom.leaflet-left';
                break;
            case 'bottomright':
                controlLocation = '.leaflet-bottom.leaflet-right';
                break;
            default:
                controlLocation = '.leaflet-top.leaflet-right';
                break;
        }
        $('.leaflet-control-container > ' + controlLocation).addClass('geocoder-modal-shown');
        $('.leaflet-control-geocoder-container').addClass('leaflet-control-geocoder-container-modal');
    }

    function hideModal() {
        switch(emapic.modules.geocoder.control.options.position) {
            case 'topleft':
                controlLocation = '.leaflet-top.leaflet-left';
                break;
            case 'bottomleft':
                controlLocation = '.leaflet-bottom.leaflet-left';
                break;
            case 'bottomright':
                controlLocation = '.leaflet-bottom.leaflet-right';
                break;
            default:
                controlLocation = '.leaflet-top.leaflet-right';
        }
        $('.leaflet-control-container > ' + controlLocation).removeClass('geocoder-modal-shown');
        $('.leaflet-control-geocoder-container.leaflet-control-geocoder-container-modal').removeClass('leaflet-control-geocoder-container-modal');
    }

    emapic.modules.geocoder.zoomToCountry = function(data) {
        if (emapic.modules.geocoder.neverZoomToCountry === true) {
            return;
        }
        if (dontZoomToCountryOnce) {
            dontZoomToCountryOnce = false;
            return;
        }
        fitBoundsWhenOutside(data.bbox);
    };

    emapic.modules.geocoder.zoomToProvince = function(data) {
        if (emapic.modules.geocoder.neverZoomToProvince === true) {
            return;
        }
        if (dontZoomToProvinceOnce) {
            dontZoomToProvinceOnce = false;
            return;
        }
        fitBoundsWhenOutside(data.bbox);
    };

    emapic.modules.geocoder.processGeocodingResult = function(result) {
        result = result.geocode || result;
        emapic.map.fitBounds(result.bbox);
    };

    emapic.modules.geocoder.addGeocoder = function(params) {
        emapic.modules.geocoder.removeGeocoder();
        removeGeocoderModalBtn();
        var baseParams = $.extend({
            collapsed: false,
            showModalSmall: true,
            defaultMarkGeocode: false,
            title: emapic.utils.getI18n('js_geocoder_title'),
            placeholder: emapic.utils.getI18n('js_geocoder_placeholder'),
            errorMessage: emapic.utils.getI18n('js_geocoder_no_results'),
            selectizePlaceholder: emapic.utils.getI18n('js_geocoder_write_select'),
            countryLabel: emapic.utils.getI18n('js_geocoder_country'),
            provinceLabel: emapic.utils.getI18n('js_geocoder_province')
        }, params);
        if ('geocoder' in baseParams && 'name' in baseParams.geocoder &&
            baseParams.geocoder.name in L.Control.Geocoder) {
            baseParams.geocoder = L.Control.Geocoder[baseParams.geocoder.name](baseParams.geocoder.params);
        } else {
            baseParams.geocoder = L.Control.Geocoder.nominatim({
                geocodingQueryParams: geocoderParams
            });
        }
        var control = emapic.modules.geocoder.control = L.Control.geocoder(baseParams);
        control.addTo(emapic.map);

        var hideModalBtn = L.DomUtil.create('button', 'close', emapic.modules.geocoder.control._innerContainer);
        $(emapic.modules.geocoder.control._innerContainer).find('button.close').append('<span aria-hidden="true">×</span>');
        L.DomEvent.addListener(hideModalBtn, 'click', hideModal, this);
        L.DomEvent.addListener(emapic.modules.geocoder.control._container, 'click', hideModal, this);

        emapic.map.on('markgeocode', function(result) {
            emapic.modules.geocoder.processGeocodingResult(result);
            hideModal();
            return this;
        }, control);

        emapic.map.on('markgeocodecountry', function(bbox) {
            emapic.modules.geocoder.zoomToCountry(bbox);
            return this;
        }, control);

        emapic.map.on('markgeocodeprovince', function(bbox) {
            emapic.modules.geocoder.zoomToProvince(bbox);
            return this;
        }, control);

        emapic.utils.disableAllEventsPropagation($('.leaflet-control-geocoder')[0]);
        if (baseParams.showModalSmall) {
            $(control._container).addClass('hide-small');
            addGeocoderModalBtn();
        }
    };

    function addGeocoderModalBtn() {
        geocoderModalControl = L.control({position: emapic.modules.geocoder.control.options.position});
        geocoderModalControl.onAdd = function (map) {
            this._div = L.DomUtil.create('div', 'leaflet-bar show-small');
            this._div.innerHTML = "<a id='control-geocoder-modal' data-placement='left' title='" + emapic.utils.getI18n('js_geocoder_title', 'Buscar en la vista actual') +
                "' href='javascript:void(0)'><span class='glyphicon glyphicon-search'></span></a>";
            return this._div;
        };
        geocoderModalControl.addTo(emapic.map);
        $('#control-geocoder-modal').on('click', showModal);
        emapic.addTooltips();
    }

    function removeGeocoderModalBtn() {
        if (isGeocoderModalBtnLoaded()) {
            geocoderModalControl.remove();
        }
    }

    function isGeocoderModalBtnLoaded() {
        return geocoderModalControl !== null &&
            '_map' in geocoderModalControl &&
            geocoderModalControl._map !== null;
    }

    emapic.modules.geocoder.isGeocoderLoaded = function() {
        return emapic.modules.geocoder.control !== null &&
            '_map' in emapic.modules.geocoder.control &&
            emapic.modules.geocoder.control._map !== null;
    };

    emapic.modules.geocoder.loadGeocoder = function() {
        if (emapic.modules.geocoder.autoUpdateWithResponseMarker) {
            var tempFunction = function() {
                if (emapic.modules.survey.marker &&
                    emapic.map.hasLayer(emapic.modules.survey.marker)) {
                    updateGeocoderWithPosition(emapic.modules.survey.marker.getLatLng());
                }
                emapic.map.off('markgeocodecountryloaded', tempFunction);
            };
            emapic.map.on('markgeocodecountryloaded', tempFunction);
        }
        emapic.modules.geocoder.addGeocoder();
    };

    emapic.modules.geocoder.removeGeocoder = function() {
        if (emapic.modules.geocoder.isGeocoderLoaded()) {
            emapic.modules.geocoder.control.remove();
        }
    };

    emapic.modules.geocoder.setCountry = function(isoCode, silent) {
        if (emapic.modules.geocoder.control.hasCountry(isoCode)) {
            if (silent === true) {
                dontZoomToCountryOnce = true;
            }
            emapic.modules.geocoder.control.setCountry(isoCode);
        }
    };

    emapic.modules.geocoder.setProvince = function(provinceId, silent) {
        if (emapic.modules.geocoder.control.hasProvince(provinceId)) {
            if (silent === true) {
                dontZoomToProvinceOnce = true;
            }
            emapic.modules.geocoder.control.setProvince(provinceId);
        }
    };

    emapic.modules.geocoder.setCountryProvince = function(isoCode, provinceId, silent) {
        if (emapic.modules.geocoder.control.hasCountry(isoCode)) {
            var tempFunction = function() {
                emapic.modules.geocoder.setProvince(provinceId, silent);
                emapic.map.off('markgeocodeprovinceloaded', tempFunction);
            };
            emapic.map.on('markgeocodeprovinceloaded', tempFunction);
            if (silent === true) {
                dontZoomToCountryOnce = true;
            }
            emapic.modules.geocoder.control.setCountry(isoCode, false, true);
        }
    };

    emapic.initializeMap = emapic.utils.overrideFunction(emapic.initializeMap, null, function() {
        if (emapic.modules.geocoder.addOnLoad === true) {
            emapic.modules.geocoder.loadGeocoder();
        }
    });

    function updateGeocoderWithPosition(latLng) {
        if (emapic.modules.geocoder.autoUpdateWithResponseMarker &&
            emapic.modules.geocoder.isGeocoderLoaded()) {
            $.getJSON(emapic.getReverseGeocodingUrl(latLng.lat, latLng.lng)).done(function(data) {
                emapic.modules.geocoder.setCountryProvince(data.country ? data.country.iso_code : null,
                    data.province ? data.province.adm_code : null, true);
            }).fail(function(jqxhr, textStatus, error) {
                console.error("JSON request for url '" + url + "' failed: " + textStatus + ", " + error );
            });
        }
    }

    if (emapic.modules.survey) {
        emapic.modules.survey.responseMarkerMoved = emapic.utils.overrideFunction(emapic.modules.survey.responseMarkerMoved,
            function(data) {
                updateGeocoderWithPosition(data.target.getLatLng());
                return data;
            }, null);
    }

}(emapic));
