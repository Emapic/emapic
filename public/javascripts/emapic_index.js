var notifications = [],
    errors = [];

function on_arrow_click() {
	$('html, body').animate({scrollTop: $("#lema").offset().top}, 1000);
};

function toggleFooterArrow() {
    $('#footer-arrow span').toggleClass('glyphicon-menu-up');
    $('#footer-arrow span').toggleClass('glyphicon-menu-down');
};

function onFooterArrowClick() {
    $('html, body').animate({scrollTop: $(document).height()}, 900);
    $('#contacts').slideToggle( "slow", function() {
        toggleFooterArrow();
    });
};

function onInitContactsExpand() {
    $('#contacts').toggle();
    toggleFooterArrow();
};

$(document).ready(function() {
    for (i in errors) {
        $.notify({
            // options
            message: errors[i]
        }, {
            delay: 0,
            type: 'danger'
        });
    }
    for (i in notifications) {
        $.notify({
            // options
            message: notifications[i]
        });
    }
});
