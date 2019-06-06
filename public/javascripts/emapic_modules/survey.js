//
// Survey related code
//

var emapic = emapic || {};

(function(emapic) {

    var originalInitEmapic = emapic.initEmapic,
        questionId;

    emapic.modules = emapic.modules || {};
    emapic.modules.survey = emapic.modules.survey || {};

    emapic.modules.survey.positionBeforeSurvey = true;
    emapic.modules.survey.surveyPostFormat = 'json';
    emapic.modules.survey.marker = null;
    emapic.modules.survey.data = {};
    emapic.modules.survey.responses = {};
    emapic.modules.survey.thksMsgTimeOut = 6000;
    emapic.modules.survey.statusMarkerIconHtml = "<svg width='51' height='46'>" +
        "<defs>\n" +
        "<pattern id='image' x='0' y='0' patternUnits='userSpaceOnUse' height='46' width='51'>\n" +
        "<image x='10' y='7' xlink:href='/images/marker-shadow.png' width='41' height='41'></image>\n" +
        "</pattern>\n" +
        "</defs>\n" +
        "<rect width='51' height='46' fill='url(#image)' />\n" +
        "<path d='M 27.997745,5.1426005 C 24.789271,2.026619 20.952126,0.47068128 16.484158,0.50959524 12.016191,0.5487035 8.2054436,2.1713216 5.091418,5.3424462 1.9378926,8.514353 0.38039059,12.350325 0.45880339,16.856033 c 0.0258144,2.991029 0.76848471,5.673295 2.18949741,8.083562 0.077632,0.11361 0.1918277,0.263983 0.3064164,0.452682 0,0 12.4091738,18.816149 13.0214198,19.71936 0.611464,0.904777 1.199853,0.01446 1.199853,0.01446 L 30.668667,24.885429 C 32.123902,22.41122 32.857383,19.640568 32.830791,16.573472 32.791683,12.06757 31.168283,8.2591689 27.997745,5.1426005 z' " +
        "inkscape:connector-curvature='0' " +
        "style='fill:{color};stroke:#000000;stroke-width:0.99133736;stroke-linejoin:miter;stroke-miterlimit:4;stroke-opacity:1;stroke-dasharray:none' />\n" +
        "<path d='M 29.368893,16.87852 V 16.9274 C 29.271122,10.652618 25.839925,6.143196 20.30038,4.6234332 h -0.04986 c -2.402053,-0.6376659 -5.04795,-0.686747 -7.352817,0 C 3.7795178,7.17234 1.4758223,18.447363 6.7701556,25.408116 c 2.3036955,2.892086 6.1275434,4.362764 9.9513914,4.362764 3.185986,0.04908 6.471308,-0.832819 8.725921,-2.940773 1.911827,-1.961104 -0.637666,-3.971289 -2.353363,-2.40264 -1.911825,1.47068 -4.264015,2.058875 -6.519998,2.058875 -4.901682,0 -8.3330754,-3.332645 -8.970546,-7.353405 L 7.4381316,17.610243 7.4563127,16.143277 C 7.7509967,12.172381 10.054496,8.8878403 13.97592,7.858501 15.642926,7.3682738 17.653698,7.3682738 19.27045,7.8094199 h -0.04869 c 3.823653,0.9810404 6.373341,4.1668311 6.716129,8.3338571 h -9.258191 c -0.820109,0 -1.485347,0.665434 -1.485347,1.485933 0,0.820499 0.665238,1.503727 1.485347,1.503727 h 10.287334 c 2.010185,1.96e-4 2.500411,-1.175605 2.401857,-2.254417 z' " +
        "inkscape:connector-curvature='0' " +
        "style='fill:#005781;stroke:#ffffff;stroke-width:0.99999998;stroke-miterlimit:4;stroke-opacity:1;stroke-dasharray:none' />\n" +
        "</svg>";

    emapic.initEmapic = function()  {
        // If we have a position, then the user already voted
        // and if we are in a results page, no survey should
        // be displayed
        if (emapic.position !== null || emapic.surveyResults) {
            originalInitEmapic();
            if (emapic.position !== null) {
                // Position must be reversed (x,y) -> (lat,lon)
                emapic.position = emapic.position.reverse();
                emapic.modules.survey.responses = emapic.oldResponses;
                emapic.modules.survey.updateResponsesMarker(false);
                emapic.map.setZoom(17);
                centerMarker();
            }
        } else if (emapic.modules.survey.positionBeforeSurvey) {
            requestUserLocation();
        } else {
            emapic.initializeMap();
            emapic.geoapi.getIpLocation();
            showSurvey();
        }
    };

    emapic.geoapi.afterGeopos = function() {
        if (emapic.modules.survey.positionBeforeSurvey) {
            showSurvey();
        } else {
            beforeSubmit();
        }
    };

    emapic.geoapi.processUserCountry = function(countryCode) {
        emapic.centerViewCountryBounds(countryCode);
    };

    function showSurvey() {
        $('#questions-flex-container').show();
        $('#questions-wrapper').show();
        emapic.modules.survey.startSurvey();
    }

    emapic.modules.survey.startSurvey = function() {
    	addBlockButtons($('div.questions-section:visible > div.questions-block').length);
    	emapic.modules.survey.toQuestionBlock(0);
    };

    emapic.modules.survey.getPostVoteUrl = function() {
        return '/api/survey/' + emapic.surveyId + '/results';
    };

    emapic.geoapi.setPosition = emapic.utils.overrideFunction(emapic.geoapi.setPosition, null, function(dumb, pos) {
        emapic.centerOnGeolocation(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy);
    });

    emapic.addIndivVotesLayer = emapic.utils.overrideFunction(emapic.addIndivVotesLayer, function() {
        if (emapic.modules.survey.marker && !emapic.map.hasLayer(emapic.modules.survey.marker) && emapic.filterFeature(emapic.modules.survey.marker.feature, emapic.modules.survey.marker)) {
            emapic.map.addLayer(emapic.modules.survey.marker);
        }
    });

    emapic.updateIndivVotesLayer = emapic.utils.overrideFunction(emapic.updateIndivVotesLayer, function() {
        if (emapic.modules.survey.marker && emapic.map.hasLayer(emapic.modules.survey.marker)) {
            emapic.map.removeLayer(emapic.modules.survey.marker);
        }
    });

    emapic.disableIndivLayerExclusiveComponents = emapic.utils.overrideFunction(emapic.disableIndivLayerExclusiveComponents, null, function() {
        if (emapic.modules.survey.marker && emapic.map.hasLayer(emapic.modules.survey.marker)) {
            emapic.map.removeLayer(emapic.modules.survey.marker);
        }
    });

    emapic.enableIndivLayerExclusiveComponents = emapic.utils.overrideFunction(emapic.enableIndivLayerExclusiveComponents, null, function() {
        if (emapic.modules.survey.marker && !emapic.map.hasLayer(emapic.modules.survey.marker) && emapic.filterFeature(emapic.modules.survey.marker.feature, emapic.modules.survey.marker)) {
            emapic.map.addLayer(emapic.modules.survey.marker);
        }
    });

    function activateAnswerButton(id) {
    	$el = $('#' + id).closest('.survey-answer');
    	$el.closest('.listbtns, .rowbtns').find('.active').removeClass('active');
    	$el.addClass('active');
    }

    emapic.modules.survey.addAnswer = function(question, htmlId, id) {
        var $el = $('#' + htmlId),
            value = ($el[0] && $el[0].files) ? ($el[0].files[0] ? $el[0].files[0] : '') : $el.val();

        if (id) {
            emapic.modules.survey.responses[question + '.id'] = id;
        }
        emapic.modules.survey.responses[question + '.value'] = value;
        activateAnswerButton(htmlId);
        emapic.modules.survey.advanceSurvey();
    };

    emapic.modules.survey.advanceSurvey = function() {
        if (!emapic.modules.survey.surveyNextStep()) {
    		emapic.modules.survey.surveyFinished();
    	}
    };

    emapic.modules.survey.surveyNextStep = function() {
    	var blocksNo = $( 'div.questions-section:visible > div.questions-block').length;
    	var activeBlockIdx = $( 'div.questions-section:visible > div.questions-block:visible' ).index();
    	var sectionsNo = $( '#questions-wrapper div.questions-section' ).length;
    	var activeSectionIdx = $( '#questions-wrapper div.questions-section:visible' ).index();
    	if ( blocksNo > 1 && activeBlockIdx < (blocksNo - 1) ) {
    		nextQuestionGroup('block');
    		btnIdx = activeBlockIdx + 1;
    		emapic.modules.survey.focusBlockButton(btnIdx);
    		document.location.href = "#questions-wrapper";
    	} else {
    		if (sectionsNo > 1 && activeSectionIdx < (sectionsNo - 1)) {
    			nextQuestionGroup('section');
    			$('.questions-section:visible div.questions-block:first').show();
    			blocksNo = $( 'div.questions-section:visible > div.questions-block').length;
    			activeBlockIdx = $( 'div.questions-section:visible > div.questions-block:visible' ).index();
    		} else {
    			return false;
    		}
    	}
    	return true;
    };

    function nextQuestionGroup(groupType) {
    	var activeGroup, nextGroup, groupsNo, activeGroupIdx, nextBlocksNo;
    	if ( groupType == 'section' ) {
    		activeGroup = $( 'div.questions-section:visible' );
    		groupsNo = $( '#questions-wrapper div.questions-section').length;
    		activeGroupIdx = activeGroup.index();
    		nextBlocksNo = $( 'div.questions-section:visible').next().children('div.questions-block').length;
    		if ( activeGroupIdx < (groupsNo - 1) ) {
    			activeGroup.toggle();
    			nextGroup = activeGroup.next();
    			nextGroup.toggle();
    			if ( (activeGroupIdx + 1) == groupsNo ) {
    				$('#survey-next-btn').hide();
    				$('#end-survey-btn').show();
    			}
    			if ( (activeGroupIdx + 1) == 3 ) {
    				$('#seccion3-title, #block-nav-btns, #survey-nav-btns').hide();
    			}
    		}
    		addBlockButtons(nextBlocksNo);
    		emapic.modules.survey.toQuestionBlock(0);
    	} else if ( groupType == 'block' ) {
    		activeGroup = $( "div.questions-block:visible" );
    		groupsNo = $( 'div.questions-section:visible > div.questions-block').length;
    		activeGroupIdx = activeGroup.index();
    		if ( activeGroupIdx < (groupsNo - 1) ) {
    			activeGroup.toggle();
    			nextGroup = activeGroup.next();
    			nextGroup.toggle();
    		}
    	}
    }

    emapic.modules.survey.surveyPrevStep = function() {
    	var blocksNo = $( 'div.questions-section:visible > div.questions-block').length;
    	var activeBlockIdx = $( 'div.questions-section:visible > div.questions-block:visible' ).index();
    	var sectionsNo = $( '#questions-wrapper div.questions-section' ).length;
    	var activeSectionIdx = $( '#questions-wrapper div.questions-section:visible' ).index();
    	if ( blocksNo > 1 && activeBlockIdx >= 1 ) {
    		prevQuestionGroup('block');
    		btnIdx = activeBlockIdx - 1;
    		emapic.modules.survey.focusBlockButton(btnIdx);
    		document.location.href = "#questions-wrapper";
    	} else {
    		if (sectionsNo > 1 && activeSectionIdx >= 1) {
    			prevQuestionGroup('section');
    			$( 'div.questions-block:visible' ).hide();
    			$(".questions-section:visible div.questions-block:last").show();
    			btnIdx = $(".questions-section:visible div.questions-block:last").index();
    			emapic.modules.survey.focusBlockButton(btnIdx);
    			activeBlockIdx = $( 'div.questions-section:visible > div.questions-block:visible' ).index();
    		}
    	}
    };

    emapic.modules.survey.toQuestionBlock = function(block) {
    	$('.questions-block:visible').hide();
    	var group = $('div.questions-section:visible > div.questions-block:eq(' + block + ')');
    	group.show();
    	emapic.modules.survey.focusBlockButton(block);
    };

    emapic.modules.survey.focusBlockButton = function(block) {
    	$( '#block-nav-btns button' ).removeClass('btn-success');
    	var $el = $( '#block-nav-btns button:eq(' + block + ')' );
    	$el.addClass('btn-success');
    	$el.prop('disabled', false);
    };

    function addBlockButtons(blocksNo) {
    	$('#block-nav-btns').html("");
    	if ( blocksNo > 1 ) {
    		for (var i = 1; i <= blocksNo; i++ ) {
    			$('#block-nav-btns').append("<button type='button' id='edit-question-btn-" + i + "' class='btn edit-question-btn' disabled onclick='emapic.modules.survey.toQuestionBlock(" + (i - 1) + ")'></button> ");
    		}
    	}
    }

    emapic.modules.survey.surveyFinished = function() {
        if (emapic.modules.survey.positionBeforeSurvey) {
            beforeSubmit();
        } else {
            requestUserLocation();
        }
    };

    function requestUserLocation() {
        // If a position must be defined, then we disable map interaction
        // until we request the user to edit it or finish the process
        if (emapic.map !== null) {
            emapic.utils.disableMapInteraction();
        } else {
            emapic.initializeMap = emapic.utils.overrideFunction(emapic.initializeMap, null, function() {
                emapic.utils.disableMapInteraction();
            });
        }
        if (emapic.geoapi.userDefaultPosition !== null) {
            emapic.geoapi.setPosition(emapic.geoapi.userDefaultPosition);
        } else if (emapic.position) {
            emapic.geoapi.afterGeopos();
        } else {
            emapic.geoapi.getLocation(emapic.userLoggedIn);
        }
    }

    function beforeSubmit() {
        emapic.modules.survey.updateResponsesMarker();
        $('#main-question').hide();
        if (($('#opt-question').length === 0) ||
          ($('#opt-question').children().length === 0)) {
            emapic.modules.survey.submitSurvey();
        } else {
            $('#opt-question').show();
        }
    }

    emapic.modules.survey.submitSurvey = function() {
        $('#survey-resume').hide();
        $('#questions-wrapper').hide();
        $('#questions-flex-container').hide();
        // If we use manual geolocation, we don't show the button for using
        // the user's default position, as it's used as the initial position
        // by default
        if (emapic.geoapi.manualGeolocation) {
            $('#user-default-position-btn').hide();
        }
        $('#check-loc').show();
    };

    emapic.modules.survey.returnToSurvey = function() {
        $('#end-survey-btn').show();
        $('#check-loc').hide();
        $('#questions-wrapper').show();
        $('#questions-flex-container').show();
    };

    emapic.modules.survey.successGeolocationApi = function(pos) {
        emapic.geoapi.saveGeopositionData(pos);
        emapic.modules.survey.marker.setLatLng(emapic.position);
        emapic.centerOnGeolocation(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy);
    };

    emapic.modules.survey.errorGeolocationApi = function(pos) {
        $('#geoposerrordefault').show();
        $('#geoposerror-title').show();
        $('#geoposresult').modal('show');
    };

    emapic.modules.survey.useApiGeolocation = function() {
        emapic.geoapi.getApiLocationRaw(emapic.modules.survey.successGeolocationApi,
            emapic.modules.survey.errorGeolocationApi);
    };

    emapic.modules.survey.confirmPosition = function() {
        $('#check-loc, #check-edit-loc').hide();
        emapic.modules.survey.endEditMarkerPos(true);
        emapic.utils.enableMapInteraction();
        if (($("#popup-form").length === 0) ||
            ($("#popup-form").children().length === 0)) {
            emapic.modules.survey.postMood(emapic.modules.survey.surveyPostFormat);
        } else {
            createMarkerPopupQuestions();
        }
    };

    emapic.modules.survey.editPosition = function() {
        $('#check-loc').hide();
        $('#check-edit-loc').show();
        editMarkerPos();
    };

    emapic.modules.survey.cancelPosition = function() {
        $('#check-edit-loc').hide();
        $('#check-loc').show();
        emapic.modules.survey.endEditMarkerPos(false);
    };

    function createMarkerPopupQuestions() {
        var userPopup = L.popup({
            closeButton: false,
            closeOnClick: false,
            maxWidth: 500,
            offset: [25, 50],
            className: 'popup-questions'
        });

        userPopup.setContent($("#popup-form").html());
        emapic.modules.survey.marker.bindPopup(userPopup);
        emapic.modules.survey.marker.openPopup();
    }

    emapic.modules.survey.preparePopupData = function() {
    };

    emapic.modules.survey.submitMarkerPopupData = function() {
        emapic.modules.survey.preparePopupData();
        emapic.modules.survey.postMood('multipart');

        emapic.modules.survey.marker.closePopup();
        emapic.modules.survey.marker.unbindPopup();
    };

    emapic.modules.survey.prepareSurveyData = function() {
    };

    emapic.modules.survey.saveVoteSuccess = function(data) {
        $('#thanks-msg').show();
        setTimeout(function(){
            $('#thanks-msg').fadeOut();
            setTimeout(emapic.startMapLogic, 500);
        }, emapic.modules.survey.thksMsgTimeOut);
    };

    emapic.modules.survey.saveVoteError = function(data) {
        $.notify({
            message: emapic.utils.getI18n('js_error_saving_vote', "Ha ocurrido un error al guardar tu voto. Prueba a recargar la página y si el problema persiste, puedes contactar con nosotros en <a href='mailto:info@emapic.es'>info@emapic.es</a>.")
        }, {
            delay: 0,
            type: 'danger',
            z_index: 12000
        });
        setTimeout(emapic.startMapLogic, 5000);
    };

    emapic.modules.survey.saveVoteComplete = function() {
        emapic.utils.enableMapInteraction();
    };

    emapic.modules.survey.postMood = function(enctype) {
        emapic.modules.survey.prepareSurveyData();

        enctype = enctype || 'json';
        emapic.utils.disableMapInteraction(true);
        switch (enctype) {
            case 'multipart':
                $.ajax({
                    type : 'POST',
                    data : emapic.modules.survey.data,
                    contentType : false,
                    processData : false,
                    url : emapic.modules.survey.getPostVoteUrl(),
                    success : emapic.modules.survey.saveVoteSuccess,
                    error : emapic.modules.survey.saveVoteError,
                    complete : emapic.modules.survey.saveVoteComplete
                });
                break;
            case 'json':
                $.ajax({
                    type : 'POST',
                    data : JSON.stringify(emapic.modules.survey.data),
                    contentType : 'application/json',
                    url : emapic.modules.survey.getPostVoteUrl(),
                    success : emapic.modules.survey.saveVoteSuccess,
                    error : emapic.modules.survey.saveVoteError,
                    complete : emapic.modules.survey.saveVoteComplete
                });
                break;
        }
    };

    function getStatusIcon(responses) {
        return L.divIcon({
            className: 'svg-marker',
            html: emapic.modules.survey.statusMarkerIconHtml.replace(/\{color\}/g, emapic.getIconColor(responses)),
            iconAnchor: [16.5, 45]
        });
    }

    function createResponsesMarker(clickable) {
        var sticon = getStatusIcon(emapic.modules.survey.responses);
        emapic.modules.survey.marker = L.marker(emapic.position, {
            icon: sticon,
            riseOnHover: true,
            zIndexOffset: -10000,
            interactive: clickable
        });
        emapic.modules.survey.marker.feature = {
            properties: $.extend({
                timestamp: Date.now()
            }, emapic.modules.survey.responses)
        };
        emapic.modules.survey.marker.feature.properties.dateObject = new Date(parseInt(emapic.modules.survey.marker.feature.properties.timestamp));
    }

    emapic.modules.survey.updateResponsesMarker = function(clickable) {
        clickable = typeof clickable !== 'undefined' ? clickable : true;
        if (emapic.modules.survey.marker && emapic.map.hasLayer(emapic.modules.survey.marker)) {
    		var oldMarker = emapic.modules.survey.marker;
    		createResponsesMarker(clickable);
            emapic.map.removeLayer(oldMarker);
            emapic.map.addLayer(emapic.modules.survey.marker);
        } else {
            createResponsesMarker(clickable);
            emapic.map.addLayer(emapic.modules.survey.marker);
        }
    };

    emapic.updateIndivVotesLayerControls = emapic.utils.overrideFunction(emapic.updateIndivVotesLayerControls,
        null, emapic.modules.survey.updateResponsesMarker);

    emapic.modules.survey.endEditMarkerPos = function(change) {
        emapic.utils.disableMapInteraction();
        if ( change ) {
            markerpos = emapic.modules.survey.marker.getLatLng();
            emapic.position = [markerpos.lat, markerpos.lng];
        } else {
            emapic.modules.survey.marker.setLatLng(emapic.position);
        }
        emapic.map.off('click', setResponseMarkerPosition);
        if ('dragging' in emapic.modules.survey.marker) {
            emapic.modules.survey.marker.dragging.disable();
        }
        centerMarker();
    }

    function centerMarker() {
        var markerPos = emapic.modules.survey.marker.getLatLng();
        emapic.map.setView(markerPos);
    }

    function editMarkerPos() {
        emapic.utils.enableMapInteraction();
        emapic.map.setView(emapic.position);
        if (emapic.modules.survey.marker !== null && 'dragging' in emapic.modules.survey.marker) {
            emapic.modules.survey.marker.dragging.enable();
        }
        emapic.map.on('click', setResponseMarkerPosition);
    }

    function setResponseMarkerPosition(e) {
        emapic.modules.survey.marker.setLatLng(e.latlng);
    }

})(emapic);
