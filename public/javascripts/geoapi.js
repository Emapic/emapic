// 
// Geolocation (IP-based, standard API)
//

var geoapiLat, geoapiLon, position0;
var ipLocationFinished = false,
    ipLocationFail = false,
    apiLocationFail = false,
    manualGeolocation = false;
var defaultPosition = {
        coords: {
            latitude: 40.416763,
            longitude: -3.703403,
            accuracy: 0
        }
    };
var userDefaultPosition = null;
var apiTimeout = 30000000;
var userCountryCode = 'es';
var apidfd = null;

function getLocation(callApi) {
    getIpLocation();
    $('#geoposwarn').modal("show");
    $('#dismiss-btn').click(function() {
        manualGeolocation = true;
        if (apidfd != null) {
            // If made a geolocation request, we reject its promise,
            // triggering a call to autolocationFailed
            apidfd.reject();
        } else {
            // If we don't have one, we call autolocationFailed manually
            autolocationFailed();
        }
    });
    if (callApi) {
        getApiLocation();
    }
}

function afterGeopos() {
}

function processUserCountry(code) {
}

function getIpLocation() {
    var json = $.getJSON( "https://www.freegeoip.net/json/",
        function(data) {
            //~ Country codes as in "ISO 3166-1 alfa-2"
            userCountryCode = data.country_code.toLowerCase() || userCountryCode;
            if (geoapiLat == null && geoapiLon == null) {
                defaultPosition.coords.latitude = data.latitude;
                defaultPosition.coords.longitude = data.longitude
                if (map == null) {
                    initializeMap();
                }
                processUserCountry(userCountryCode);
            }
            ipLocationFinished = true;
            autolocationFailed();
        }).fail(function() {
            ipLocationFinished = true;
            ipLocationFail = true;
            console.log("not able to connect to freegeoip");
            autolocationFailed();
        });
}

function declineGeoposwarn() {
    window.location = 'http://cartolab.udc.es/';
}

function getApiLocationRaw(successCallback, failCallback) {
    // standard geolocation api location
    apidfd = new $.Deferred();

    function errorCallback(error) {
        //~ Location error handling

        console.log('ERROR(' + error.code + '): ' + error.message);
        var message = "";
        apiLocationFail = true;
        switch (error.code) {
            case error.PERMISSION_DENIED:
            message = "This website does not have permission to use " + "the Geolocation API";
            break;

            case error.POSITION_UNAVAILABLE:
            message = "The current position could not be determined.";
            break;

            case error.PERMISSION_DENIED_TIMEOUT:
            message = "The current position could not be determined " + "within the specified timeout period.";
            break;

            case error.TIMEOUT:
            message = "The request to get user location timed out."
            break;

            case error.UNKNOWN_ERROR:
            message = "An unknown error occurred."
            break;
        }

        if (message == "") {
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
    usedGeolocation = true;
    apidfd.promise().then(function(pos) {
        geoapiLat = pos.coords.latitude;
        geoapiLon = pos.coords.longitude;
        successCallback(pos);
    }, failCallback);
}

function getApiLocation() {
    getApiLocationRaw(setPosition, autolocationFailed);
}

function saveGeopositionData(pos) {
    position = [pos.coords.latitude, pos.coords.longitude];
    position0 = position;
}

function setPosition(pos) {
    saveGeopositionData(pos);
    $('#waiting-location').modal("hide");
    if (map == null) {
        initializeMap();
    }
    $('#geoposwarn').modal("hide");
    afterGeopos();
}

function autolocationFailed() {
    if (ipLocationFinished && manualGeolocation) {
        $('#geoposwarn').modal("hide");
        if (userDefaultPosition) {
            $('#geoposmanualdefault').show();
        } else if (ipLocationFail) {
            if (map == null) {
                initializeMap();
            }
            $('#geoposmanual').show();
        } else {
            $('#geoposmanualip').show();
        }
        $('#geoposmanual-title').show();
        $('#geoposresult').modal('show');
    } else if (ipLocationFinished && apiLocationFail) {
        // If the geolocation fails, then it's like manual geolocation
        // from now on.
        manualGeolocation = true;
        $('#geoposwarn').modal("hide");
        if (ipLocationFail) {
            if (map == null) {
                initializeMap();
            }
            $('#geoposallerror').show();
        } else {
            $('#geoposapierror').show();
        }
        $('#geoposerror-title').show();
        $('#geoposresult').modal('show');
    }
}

function autolocationFailedAck() {
    $('#geoposresult').modal('hide');
    if (position == null) {
        setPosition(userDefaultPosition || defaultPosition);
        position0 = [null, null];
        if (!userDefaultPosition && ipLocationFail) {
            processUserCountry(userCountryCode);
        }
    }
}
