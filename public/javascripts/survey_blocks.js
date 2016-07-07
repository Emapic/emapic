//
// Survey (based in question blocks) related code
//

function startSurvey() {
	/*$('#general, #survey-nav-btns').show();
	$('#section-nav-btns').show();
	$(".questions-block").hide();
	$('#end-survey-btn').hide();*/
	addBlockButtons( $('div.questions-section:visible > div.questions-block').length );
	toQuestionBlock(0);
}

var afterGeopos = overrideFunction(afterGeopos, null, startSurvey);

function continueSurvey() {
	surveyNextStep();
	$('#seccion3-title, #block-nav-btns, #survey-nav-btns').show();
}

function surveyNextStep() {
	var blocksNo = $( 'div.questions-section:visible > div.questions-block').length;
	var activeBlockIdx = $( 'div.questions-section:visible > div.questions-block:visible' ).index();
	var sectionsNo = $( '#questions-wrapper div.questions-section' ).length;
	var activeSectionIdx = $( '#questions-wrapper div.questions-section:visible' ).index();
	if ( blocksNo > 1 && activeBlockIdx < (blocksNo - 1) ) {
		nextQuestionGroup('block');
		btnIdx = activeBlockIdx + 1;
		focusBlockButton(btnIdx);
		document.location.href = "#questions-wrapper";
		/*if (activeBlockIdx == (blocksNo - 2) && activeSectionIdx == (sectionsNo - 1)) {
			$('#end-survey-btn').show();
			$('#survey-next-btn').hide();
		}*/
	} else {
		if (sectionsNo > 1 && activeSectionIdx < (sectionsNo - 1)) {
			nextQuestionGroup('section');
			$(".questions-section:visible div.questions-block:first").show();
			blocksNo = $( 'div.questions-section:visible > div.questions-block').length;
			activeBlockIdx = $( 'div.questions-section:visible > div.questions-block:visible' ).index();
			/*if (activeBlockIdx == (blocksNo - 1) && activeSectionIdx == (sectionsNo - 2)) {
				$('#end-survey-btn').show();
				$('#survey-next-btn').hide();
			}*/
		} else {
			return false;
		}
	}
	return true;
	//$('#prev-step-btn').show();
}

function surveyPrevStep() {
	var blocksNo = $( 'div.questions-section:visible > div.questions-block').length;
	var activeBlockIdx = $( 'div.questions-section:visible > div.questions-block:visible' ).index();
	var sectionsNo = $( '#questions-wrapper div.questions-section' ).length;
	var activeSectionIdx = $( '#questions-wrapper div.questions-section:visible' ).index();
	if ( blocksNo > 1 && activeBlockIdx >= 1 ) {
		prevQuestionGroup('block');
		btnIdx = activeBlockIdx - 1;
		focusBlockButton(btnIdx);
		document.location.href = "#questions-wrapper";
		/*if (activeBlockIdx == 1 && activeSectionIdx == 0) {
			$('#prev-step-btn').hide();
		}*/
	} else {
		if (sectionsNo > 1 && activeSectionIdx >= 1) {
			prevQuestionGroup('section');
			$( 'div.questions-block:visible' ).hide();
			$(".questions-section:visible div.questions-block:last").show();
			btnIdx = $(".questions-section:visible div.questions-block:last").index();
			focusBlockButton(btnIdx);
			activeBlockIdx = $( 'div.questions-section:visible > div.questions-block:visible' ).index();
			/*if (activeBlockIdx == 0 && activeSectionIdx == 1) {
				$('#prev-step-btn').hide();
			}*/
		}
	}
	/*$('#end-survey-btn').hide();
	$('#survey-next-btn').show();*/
}

function toQuestionSection(section) {
	$( '#questions-wrapper div.questions-section' ).hide();
	$( '#questions-wrapper div.questions-section:eq(' + section + ')' ).toggle();
	addBlockButtons( $('div.questions-section:visible > div.questions-block').length );
	toQuestionBlock(0);
}

function toQuestionBlock(block) {
	$( '.questions-block:visible' ).hide();
	var group = $( 'div.questions-section:visible > div.questions-block:eq(' + block + ')' );
	group.show();
	focusBlockButton( block );
}

function focusBlockButton(block) {
	$( '#block-nav-btns button' ).removeClass('btn-success');
	var $el = $( '#block-nav-btns button:eq(' + block + ')' );
	$el.addClass('btn-success');
	$el.prop('disabled', false);
}

function addBlockButtons(blocksNo) {
	$('#block-nav-btns').html("");
	if ( blocksNo > 1 ) {
		for (var i = 1; i <= blocksNo; i++ ) {
			$('#block-nav-btns').append("\
				<button type='button' id='edit-question-btn-" + i + "' class='btn edit-question-btn' disabled onclick='toQuestionBlock(" + (i - 1) + ")'></button>\
			");
		}
	}
}

function nextQuestionGroup(groupType) {
	var activeGroup, nextGroup, groupsNo, activeGroupIdx, nextBlocksNo;
	if ( groupType == 'section' ) {
		activeGroup = $( 'div.questions-section:visible' );
		groupsNo = $( '#questions-wrapper div.questions-section').length;
		activeGroupIdx = activeGroup.index();
		nextBlocksNo = $( 'div.questions-section:visible').next().children('div.questions-block').length;
		if ( activeGroupIdx < (groupsNo - 1) ) {
			activeGroup
				.toggle();
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
		toQuestionBlock(0);
	} else if ( groupType == 'block' ) {
		activeGroup = $( "div.questions-block:visible" );
		groupsNo = $( 'div.questions-section:visible > div.questions-block').length;
		activeGroupIdx = activeGroup.index();
		if ( activeGroupIdx < (groupsNo - 1) ) {
			activeGroup
				.toggle();
			nextGroup = activeGroup.next();
			nextGroup.toggle();
		}
	}
}

function prevQuestionGroup(groupType) {
	var activeGroup, prevGroup, groupsNo, activeGroupIdx, prevBlocksNo;
	if ( groupType == 'section' ) {
		activeGroup = $( 'div.questions-section:visible' );
		groupsNo = $( '#questions-wrapper > div.questions-section').length;
		activeGroupIdx = activeGroup.index();
		prevBlocksNo = $( 'div.questions-section:visible').prev().children('div.questions-block').length;
		if ( activeGroupIdx >= 1 ) {
			activeGroup
				.toggle();
			prevGroup = activeGroup.prev();
			prevGroup.toggle();
			$('#end-survey-btn').hide();
			$('#survey-next-btn').show();
		}
		addBlockButtons(prevBlocksNo);
		toQuestionBlock(0);
	} else if ( groupType == 'block' ) {
		activeGroup = $( "div.questions-block:visible" );
		groupsNo = $( 'div.questions-section:visible > div.questions-block').length;
		activeGroupIdx = activeGroup.index();
		if ( activeGroupIdx >= 1 ) {
			activeGroup
				.toggle();
			prevGroup = activeGroup.prev();
			prevGroup.toggle();
		}
	}
}

function activateButton(id) {
	$el = $('#' + id).closest('.survey-answer');
	$el.closest('.listbtns, .rowbtns').find('.active').removeClass('active');
	$el.addClass('active');
}
