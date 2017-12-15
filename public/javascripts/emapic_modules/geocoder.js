//
// Emapic geocoder
//

var emapic = emapic || {};

(function(emapic) {

    emapic.modules = emapic.modules || {};
    emapic.modules.geocoder = emapic.modules.geocoder || {};
    emapic.modules.geocoder.addOnLoad = true;
    emapic.modules.geocoder.control = null;

    var geocoderParams = {};
    if (emapic.utils.nominatimEmail !== null) {
        geocoderParams.email = emapic.utils.nominatimEmail;
    }

    emapic.modules.geocoder.searchLocation = function(location) {
        $('div.leaflet-control-geocoder .leaflet-control-geocoder-form input').val(location);
        $('div.leaflet-control-geocoder .leaflet-control-geocoder-form button').click();
    };

    emapic.modules.geocoder.processGeocodingResult = function(result) {
        result = result.geocode || result;
        emapic.map.fitBounds(result.bbox);
    };

    emapic.modules.geocoder.addGeocoder = function(params) {
        emapic.modules.geocoder.removeGeocoder();
        var baseParams = $.extend({
            collapsed: false,
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

        control.on('markgeocode', function(result) {
            emapic.modules.geocoder.processGeocodingResult(result);
            return this;
        }, control);

        emapic.utils.disableAllEventsPropagation($('.leaflet-control-geocoder')[0]);
    }

    emapic.modules.geocoder.loadGeocoder = function() {
        emapic.modules.geocoder.addGeocoder();
    }

    emapic.modules.geocoder.removeGeocoder = function() {
        if (emapic.modules.geocoder.control !== null &&
            '_map' in emapic.modules.geocoder.control &&
            emapic.modules.geocoder.control._map !== null) {
            emapic.modules.geocoder.control.removeFrom(emapic.map);
        }
    }

    emapic.initializeMap = emapic.utils.overrideFunction(emapic.initializeMap, null, function() {
        if (emapic.modules.geocoder.addOnLoad === true) {
            emapic.modules.geocoder.loadGeocoder();
        }
    });

}(emapic));
