//
// Geolocation (IP-based, standard API)
//

var emapic = emapic || {};

(function(emapic) {

    var ipLocationFinished = false,
        ipLocationFail = false,
        apiLocationFail = false,
        apiTimeout = 30000,
        apidfd = null;

    emapic.geoapi = emapic.geoapi || {};

    emapic.geoapi.defaultPosition = {
        coords: {
            latitude: 40.416763,
            longitude: -3.703403,
            accuracy: 0
        }
    };

    emapic.geoapi.ipgeolocationAPIKey = null;
    emapic.geoapi.geoapiLat = null;
    emapic.geoapi.geoapiLon = null;
    emapic.geoapi.position0 = null;

    emapic.geoapi.useDefaultOverIp = false;
    emapic.geoapi.manualGeolocation = false;
    emapic.geoapi.userDefaultPosition = null;
    emapic.geoapi.userCountryCode = 'es';

    emapic.geoapi.getLocation = function(callApi) {
        emapic.geoapi.getIpLocation();
        $('#geoposwarn').modal("show");
        $('#dismiss-btn').click(function() {
            emapic.geoapi.manualGeolocation = true;
            if (apidfd !== null) {
                // If made a geolocation request, we reject its promise,
                // triggering a call to autolocationFailed
                apidfd.reject();
            } else {
                // If we don't have one, we call autolocationFailed manually
                autolocationFailed();
            }
        });
        if (callApi) {
            emapic.geoapi.getApiLocation();
        }
    };

    emapic.geoapi.afterGeopos = function() {
    };

    emapic.geoapi.processUserCountry = function(code) {
    };

    emapic.geoapi.getIpLocation = function() {
        if (!ipLocationFinished) {
            if (emapic.geoapi.useDefaultOverIp || !emapic.geoapi.ipgeolocationAPIKey) {
                ipLocationFinished = true;
                ipLocationFail = true;
            } else {
                getIpLocationRaw();
            }
        }
    };

    function getIpLocationRaw() {
        var json = $.getJSON("https://api.ipgeolocation.io/ipgeo?apiKey=" + emapic.geoapi.ipgeolocationAPIKey).done(
            function(data) {
                //~ Country codes as in "ISO 3166-1 alfa-2"
                emapic.geoapi.userCountryCode = data.country_code2.toLowerCase() || emapic.geoapi.userCountryCode;
                if (emapic.geoapi.geoapiLat === null && emapic.geoapi.geoapiLon === null && !isNaN(data.latitude) && !isNaN(data.longitude)) {
                    emapic.geoapi.defaultPosition.coords.latitude = parseFloat(data.latitude);
                    emapic.geoapi.defaultPosition.coords.longitude = parseFloat(data.longitude);
                    if (emapic.map === null) {
                        emapic.initializeMap();
                    }
                    emapic.geoapi.processUserCountry(emapic.geoapi.userCountryCode);
                }
                ipLocationFinished = true;
                autolocationFailed();
            }).fail(function() {
                ipLocationFinished = true;
                ipLocationFail = true;
                console.log("Not able to connect to ipgeolocation");
                autolocationFailed();
            });
    }

    emapic.geoapi.getApiLocationPromise = function() {
        // standard geolocation api location
        apidfd = new $.Deferred();

        function errorCallback(error) {
            //~ Location error handling

            console.log('ERROR(' + error.code + '): ' + error.message);
            var message = "";
            apiLocationFail = true;
            switch (error.code) {
                case error.PERMISSION_DENIED:
                message = "This website does not have permission to use the Geolocation API";
                break;

                case error.POSITION_UNAVAILABLE:
                message = "The current position could not be determined.";
                break;

                case error.PERMISSION_DENIED_TIMEOUT:
                message = "The current position could not be determined within the specified timeout period.";
                break;

                case error.TIMEOUT:
                message = "The request to get user location timed out.";
                break;

                case error.UNKNOWN_ERROR:
                message = "An unknown error occurred.";
                break;
            }

            if (message === "") {
                var strErrorCode = error.code.toString();
                message = "The position could not be determined due to " +
                    "an unknown error (Code: " + strErrorCode + ").";
            }
            console.log('GEOLOCATION ERROR: ' + message);
            apidfd.reject();
        }

        function confirmPosition(pos) {
            apidfd.resolve(pos);
        }

        if ( navigator.geolocation ) {
            navigator.geolocation.getCurrentPosition(confirmPosition, errorCallback, {timeout: apiTimeout, maximumAge: 300000});
            setTimeout(function () {
                if (apidfd.state() == "pending") {
                    apiLocationFail = true;
                    console.log("GEOLOCATION ERROR: Timeout passed, most probably due to no confirmation from user");
                    apidfd.reject();
                }
            }, apiTimeout + 5000);
        } else {
            apiLocationFail = true;
            console.log("GEOLOCATION ERROR: Standard Geolocation API no available");
            apidfd.reject();
        }
        return apidfd.promise();
    };

    emapic.geoapi.getApiLocationRaw = function(successCallback, failCallback) {
        emapic.geoapi.getApiLocationPromise().done(function(pos) {
            emapic.geoapi.geoapiLat = pos.coords.latitude;
            emapic.geoapi.geoapiLon = pos.coords.longitude;
            reverseGeocodeRetrievedPosition(emapic.geoapi.geoapiLat, emapic.geoapi.geoapiLon);
            successCallback(pos);
        }).fail(failCallback);
    };

    emapic.geoapi.getApiLocation = function() {
        emapic.geoapi.getApiLocationRaw(emapic.geoapi.setPosition, autolocationFailed);
    };

    emapic.geoapi.saveGeopositionData = function(pos) {
        emapic.position = [pos.coords.latitude, pos.coords.longitude];
        emapic.geoapi.position0 = emapic.position;
    };

    emapic.geoapi.setPosition = function(pos) {
        emapic.geoapi.saveGeopositionData(pos);
        $('#waiting-location').modal("hide");
        if (emapic.map === null) {
            emapic.initializeMap();
        }
        $('#geoposwarn').modal("hide");
        emapic.geoapi.afterGeopos();
    };

    function autolocationFailed() {
        if (ipLocationFinished && emapic.geoapi.manualGeolocation) {
            $('#geoposwarn').modal("hide");
            if (emapic.geoapi.userDefaultPosition) {
                $('#geoposmanualdefault').show();
            } else if (ipLocationFail) {
                if (emapic.map === null) {
                    emapic.initializeMap();
                }
                $('#geoposmanual').show();
            } else {
                reverseGeocodeRetrievedPosition(emapic.geoapi.defaultPosition.coords.latitude,
                    emapic.geoapi.defaultPosition.coords.longitude);
                $('#geoposmanualip').show();
            }
            $('#geoposmanual-title').show();
            $('#geoposresult').modal('show');
        } else if (ipLocationFinished && apiLocationFail) {
            // If the geolocation fails, then it's like manual geolocation
            // from now on.
            emapic.geoapi.manualGeolocation = true;
            $('#geoposwarn').modal("hide");
            if (ipLocationFail) {
                if (emapic.map === null) {
                    emapic.initializeMap();
                }
                $('#geoposallerror').show();
            } else {
                reverseGeocodeRetrievedPosition(emapic.geoapi.defaultPosition.coords.latitude,
                    emapic.geoapi.defaultPosition.coords.longitude);
                $('#geoposapierror').show();
            }
            $('#geoposerror-title').show();
            $('#geoposresult').modal('show');
        }
    }

    emapic.geoapi.autolocationFailedAck = function() {
        $('#geoposresult').modal('hide');
        if (emapic.position === null) {
            emapic.geoapi.setPosition(emapic.geoapi.userDefaultPosition || emapic.geoapi.defaultPosition);
            emapic.geoapi.position0 = [null, null];
        }
    };

    function reverseGeocodeRetrievedPosition(lat, lon) {
        if ($('.loc-description').length) {
            emapic.utils.reverseGeocodePosition(lat, lon).done(function(data) {
                $('.loc-description-text').html(data.display_name);
                $('.loc-description').show();
            });
        }
    }

})(emapic);
