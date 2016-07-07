//
// Survey related code
//
var questionId;
var totalQuestions = 6;
var optionalQuestions = 3;
var answers = [];
var oldResponses;
var responses = {};
var data = {};
var userStatusCls;
var userLoggedIn = false;
var marker;
var markerClickable;
var color = 'purple';
var thksMsgTimeOut = 3000;
var statusMarkerIconHtml = '<svg width="51" height="46">\
    <defs>\
        <pattern id="image" x="0" y="0" patternUnits="userSpaceOnUse" height="46" width="51">\
            <image x="10" y="7" xlink:href="/images/marker-shadow.png" width="41" height="41"></image>\
        </pattern>\
    </defs>\
    <rect width="51" height="46" fill="url(#image)" />\
    <path\
       d="M 27.997745,5.1426005 C 24.789271,2.026619 20.952126,0.47068128 16.484158,0.50959524 12.016191,0.5487035 8.2054436,2.1713216 5.091418,5.3424462 1.9378926,8.514353 0.38039059,12.350325 0.45880339,16.856033 c 0.0258144,2.991029 0.76848471,5.673295 2.18949741,8.083562 0.077632,0.11361 0.1918277,0.263983 0.3064164,0.452682 0,0 12.4091738,18.816149 13.0214198,19.71936 0.611464,0.904777 1.199853,0.01446 1.199853,0.01446 L 30.668667,24.885429 C 32.123902,22.41122 32.857383,19.640568 32.830791,16.573472 32.791683,12.06757 31.168283,8.2591689 27.997745,5.1426005 z"\
       inkscape:connector-curvature="0"\
       style="fill:{color};stroke:#000000;stroke-width:0.99133736;stroke-linejoin:miter;stroke-miterlimit:4;stroke-opacity:1;stroke-dasharray:none" />\
    <path\
       d="M 29.368893,16.87852 V 16.9274 C 29.271122,10.652618 25.839925,6.143196 20.30038,4.6234332 h -0.04986 c -2.402053,-0.6376659 -5.04795,-0.686747 -7.352817,0 C 3.7795178,7.17234 1.4758223,18.447363 6.7701556,25.408116 c 2.3036955,2.892086 6.1275434,4.362764 9.9513914,4.362764 3.185986,0.04908 6.471308,-0.832819 8.725921,-2.940773 1.911827,-1.961104 -0.637666,-3.971289 -2.353363,-2.40264 -1.911825,1.47068 -4.264015,2.058875 -6.519998,2.058875 -4.901682,0 -8.3330754,-3.332645 -8.970546,-7.353405 L 7.4381316,17.610243 7.4563127,16.143277 C 7.7509967,12.172381 10.054496,8.8878403 13.97592,7.858501 15.642926,7.3682738 17.653698,7.3682738 19.27045,7.8094199 h -0.04869 c 3.823653,0.9810404 6.373341,4.1668311 6.716129,8.3338571 h -9.258191 c -0.820109,0 -1.485347,0.665434 -1.485347,1.485933 0,0.820499 0.665238,1.503727 1.485347,1.503727 h 10.287334 c 2.010185,1.96e-4 2.500411,-1.175605 2.401857,-2.254417 z"\
       inkscape:connector-curvature="0"\
       style="fill:#005781;stroke:#ffffff;stroke-width:0.99999998;stroke-miterlimit:4;stroke-opacity:1;stroke-dasharray:none" />\
</svg>';

var originalInitEmappy = initEmappy;

var initEmappy = function()  {
    // If we have a position, then the user already voted
    // and if we are in a results page, no survey should
    // be displayed
    if (position != null || surveyResults) {
        originalInitEmappy();
        if (position != null) {
            // Position must be reversed (x,y) -> (lat,lon)
            position = position.reverse();
            responses = oldResponses;
            updateResponsesMarker(false);
            map.setZoom(17);
            centerMarker();
        }
    } else {
        // If a position must be defined, then we disable map interaction
        // until we request the user to edit it or finish the process
        initializeMap = overrideFunction(initializeMap, null, function() {
            disableMapInteraction();
        });
        if (userDefaultPosition != null) {
            setPosition(userDefaultPosition);
        } else {
            getLocation(userLoggedIn);
        }
    }
};

var afterGeopos = function() {
    $('#questions-wrapper').show();
};

var processUserCountry = function(code) {
    centerViewBounds(code);
};

function getPostVoteUrl() {
    return '/api/survey/' + surveyId + '/results';
}

var setPosition = overrideFunction(setPosition, null, function(dumb, pos) {
    centerOnGeolocation(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy);
});

var addIndivVotesLayer = overrideFunction(addIndivVotesLayer, function() {
    if (marker && !map.hasLayer(marker) && filterFeature(marker.feature, marker)) {
        map.addLayer(marker);
    }
});

var updateIndivVotesLayer = overrideFunction(updateIndivVotesLayer, function() {
    if (marker && map.hasLayer(marker)) {
        map.removeLayer(marker);
    }
});

var disableIndivLayerExclusiveComponents = overrideFunction(disableIndivLayerExclusiveComponents, null, function() {
    if (marker && map.hasLayer(marker)) {
        map.removeLayer(marker);
    }
});

var enableIndivLayerExclusiveComponents = overrideFunction(enableIndivLayerExclusiveComponents, null, function() {
    if (marker && !map.hasLayer(marker) && filterFeature(marker.feature, marker)) {
        map.addLayer(marker);
    }
});

function addAnswer(question, htmlId, id) {
    var value = $('#' + htmlId).val();
    if (id) {
        responses[question + '.id'] = id;
    }
    responses[question + '.value'] = value;
    activateButton(htmlId);
    advanceSurvey();
}

function advanceSurvey() {
    if (!surveyNextStep()) {
		surveyFinished();
	}
}

function surveyFinished() {
	updateResponsesMarker();
	$('#main-question').hide();
	if (($('#opt-question').length == 0) ||
		($('#opt-question').children().length == 0)) {
		submitSurvey();
	} else {
		$('#opt-question').show();
	}
}

function addOptionalQuestions(answer) {
    $('#opt-question').hide();
    $('#survey-summary-table tr.summary-optional').hide();
    if ( answer == 'True' ) {
        $('#questions').append(
            $('#optional-questions').html()
        );
        totalQuestions += optionalQuestions;
        $('#survey-summary-table tr.summary-optional').show();
    }
    showQuestion();
}

function showQuestion() {
    $('#questions').children('div').each(function(child) {
        if ( $(this).hasClass('vote-bar') ) {
            var childId = child + 1;
            var select = $('select#vote-value-' + childId);
            var slider = $( "<div id='slider-" + childId + "'></div>" ).insertAfter( select ).slider({
                min: 1,
                max: 5,
                range: "min",
                value: select[ 0 ].selectedIndex + 1,
                slide: function( event, ui ) {
                    select[ 0 ].selectedIndex = ui.value - 1;
                }
            });
            $('select#vote-value-' + childId).change(function() {
                slider.slider( "value", this.selectedIndex + 1 );
            });
        }

        var questionIdx = child + 1;
        $('#edit-question-btn').append("\
            <button type='button' id='edit-question-btn-" + questionIdx + "' class='btn btn-info edit-question-btn' onclick='changeQuestion(" + questionIdx + ")'></button>\
        ");
    });

    changeQuestion(1);
}

function changeQuestion(toQuestionId) {
    $('#edit-question-btn-' + questionId).addClass('btn-info');
    questionId = toQuestionId;
    $('#edit-question-btn-' + questionId).removeClass('btn-info');
    $('.question').hide();
    $('#question-' + questionId).show();
    $('#questions-counter').html(questionId + ' / ' + totalQuestions);
}

function nextQuestion() {
    $('.question').hide();
    $('#edit-question-btn-' + questionId).addClass('btn-info');
    questionId += 1;
    $('#edit-question-btn-' + questionId).removeClass('btn-info');

    if ( questionId <= totalQuestions ) {
        $('#question-' + questionId).show();
        $('#questions-counter').html(questionId + ' / ' + totalQuestions);
    } else {
        $('#questions-wrapper').hide();
        toggleCheckSubmitSurvey();
        fillResumeAnswers();
    }
}

function toggleCheckSubmitSurvey() {
    $('#questions').toggle();
    $('#questions-counter, #edit-question-btn').toggle();
    $('#survey-resume').toggle();
}

function fillResumeAnswers() {
    if ( userStatus == status_2 ) {
        $('#happybtn').hide();
    } else {
        $('#sadbtn').hide();
    }
    $('#survey-resume .answer').each(function(i) {
        var answer = answers[i + 1];
        if ( answer === undefined ) {
            answer = '-';
        }
        $(this).html("<h4>" + answer  + "</h4>");
    });
}

function restartSurvey() {
    $('#questions-wrapper').show();
    toggleCheckSubmitSurvey();
    changeQuestion(1);
}

function submitSurvey() {
    $('#survey-resume').hide();
    $('#questions-wrapper').hide();
    // If we use manual geolocation, we don't show the button for using
    // the user's default position, as it's used as the initial position
    // by default
    if (manualGeolocation) {
        $('#user-default-position-btn').hide();
    }
    $('#check-loc').show();
}

function returnToSurvey() {
    $('#end-survey-btn').show();
    $('#check-loc').hide();
    $('#questions-wrapper').show();
}

function addBarAnswer(questionId) {
    answer = $('#vote-value-' + questionId).val();
    answers[questionId] = answer;
    nextQuestion();
}

function addRadioAnswer(radioName, questionId) {
    answer = $('input[name="' + radioName + '"]:checked').val();
    answers[questionId] = answer;
    nextQuestion();
}

function addCheckAnswer(checkName, questionId) {
    var sisrefs = [];
    $('input[name="' + checkName + '"]:checked').each(function() {
        sisrefs.push(this.value);
    });
    answers[questionId] = sisrefs.toString();
    nextQuestion();
}

function useUserDefaultPosition() {
    if (userDefaultPosition) {
        position = [userDefaultPosition.coords.latitude, userDefaultPosition.coords.longitude];
    }
    cancelPosition();
}

function successGeolocationApi(pos) {
    saveGeopositionData(pos);
    marker.setLatLng(position);
    centerOnGeolocation(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy);
}

function errorGeolocationApi(pos) {
    $('#geoposerrordefault').show();
    $('#geoposerror-title').show();
    $('#geoposresult').modal('show');
}

function useApiGeolocation() {
    getApiLocationRaw(successGeolocationApi, errorGeolocationApi);
}

function confirmPosition() {
    $('#check-loc, #check-edit-loc').hide();
    endEditMarkerPos(true);
    enableMapInteraction();
    if (($("#popup-form").length == 0) ||
        ($("#popup-form").children().length == 0)) {
        postMood();
    } else {
        createMarkerPopupQuestions();
    }
}

function editPosition() {
    $('#check-loc').hide();
    $('#check-edit-loc').show();
    editMarkerPos();
}

function cancelPosition() {
    $('#check-edit-loc').hide();
    $('#check-loc').show();
    endEditMarkerPos(false);
}

function createMarkerPopupQuestions() {
    var userPopup = L.popup({
        closeButton: false,
        closeOnClick: false,
        maxWidth: 500,
        offset: [25, 50],
        className: 'popup-questions'
    });

    userPopup.setContent($("#popup-form").html());
    marker.bindPopup(userPopup);

    marker.openPopup();
}

function preparePopupData() {
}

function submitMarkerPopupData() {
    preparePopupData();
    postMood();

    marker.closePopup();
    marker.unbindPopup();
    createMarkerPopup();
}

function prepareSurveyData() {
}

function postMood() {
    prepareSurveyData();

    $.ajax({
        type : 'POST',
        data : JSON.stringify(data),
        contentType : 'application/json',
        url : getPostVoteUrl(),
        success : function(data) {
            //console.log('POST success');
            //console.log(JSON.stringify(data));
            $('#thanks-msg').show();
            setTimeout(function(){
                $('#thanks-msg').fadeOut();
                startMapLogic();
            }, thksMsgTimeOut);
        },
        error : function(data) {
            //console.log('POST error');
            //console.log(JSON.stringify(data));
            startMapLogic();
        }
    });
}

function getStatusIcon(responses) {
    return L.divIcon({
        className: 'svg-marker',
        html: statusMarkerIconHtml.replace(/\{color\}/g, getIconColor(responses)),
        iconAnchor: [16.5, 45]
    });
}

function createResponsesMarker() {
    var sticon = getStatusIcon(responses);
    marker = L.marker(position, {
        icon: sticon,
        riseOnHover: true,
        zIndexOffset: -10000,
        clickable: markerClickable
    });
    marker.feature = {
        properties: $.extend({
            timestamp: Date.now()
        }, responses)
    };
    marker.feature.properties.dateObject = new Date(parseInt(marker.feature.properties.timestamp));
}

function updateResponsesMarker(clickable) {
    if (marker && map.hasLayer(marker)) {
		var oldMarker = marker;
		createResponsesMarker();
        map.removeLayer(oldMarker);
        map.addLayer(marker);
    } else {
    	markerClickable = typeof clickable !== 'undefined' ? clickable : true;
        createResponsesMarker();
        map.addLayer(marker);
    }
}

updateIndivVotesLayerControls = overrideFunction(updateIndivVotesLayerControls, null, updateResponsesMarker);

function createMarkerPopup() {
    var popupHtml = getPopupHtml(data);
    if (popupHtml != null && popupHtml.length > 0) {
        var userPopup = L.popup({
            offset: [25, 50],
            className: 'popup-user popup-userinfo' + " popup-user-" + userStatusCls
        });
        userPopup.setContent($(popupHtml).html());
        marker.bindPopup(userPopup);
    }
}

function centerMarker() {
    var markerPos = marker.getLatLng();
    map.setView(markerPos);
}

function editMarkerPos() {
    enableMapInteraction();
    map.setView(position);
    marker.dragging.enable();
    map.on('click', function(e) {
        marker.setLatLng(e.latlng);
    });
}

function endEditMarkerPos(change) {
    disableMapInteraction();
    if ( change ) {
        markerpos = marker.getLatLng();
        position = [markerpos.lat, markerpos.lng];
        //updateUserCountry(position);
    } else {
        marker.setLatLng(position);
    }
    map.off('click');
    centerMarker();
}
