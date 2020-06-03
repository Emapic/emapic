//
// Emapic general website functions
//

var emapic = emapic || {};

(function(emapic) {

    var notifications = [],
        errors = [];

    emapic.website = emapic.website || {};

    emapic.website.addNotification = function(msg) {
        notifications.push(msg);
    };

    emapic.website.addError = function(msg) {
        errors.push(msg);
    };

    emapic.website.getNotifications = function() {
        return notifications;
    };

    emapic.website.getErrors = function() {
        return errors;
    };

    emapic.website.onArrowClick = function() {
    	$('html, body').animate({scrollTop: $("#lema").offset().top}, 1000);
    };

    function toggleFooterArrow() {
        $('#footer-arrow span').toggleClass('glyphicon-menu-up');
        $('#footer-arrow span').toggleClass('glyphicon-menu-down');
    }

    emapic.website.onFooterArrowClick = function() {
        $('html, body').animate({scrollTop: $(document).height()}, 900);
        $('#contacts').slideToggle( "slow", function() {
            toggleFooterArrow();
        });
    };

    emapic.website.onInitContactsExpand = function() {
        $('#contacts').toggle();
        toggleFooterArrow();
    };

})(emapic);

$(document).ready(function() {
    var errors = emapic.website.getErrors(),
        notifications = emapic.website.getNotifications();
    for (var i in errors) {
        $.notify({
            message: errors[i]
        }, {
            delay: 0,
            type: 'danger'
        });
    }
    for (i in notifications) {
        $.notify({
            message: notifications[i]
        }, {
            delay: 15000
        });
    }
});
