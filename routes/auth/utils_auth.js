// utils_auth.js/
var nodemailer = require('nodemailer'),
    i18n = require('i18n-2'),
    crypto = require('crypto'),
    bcrypt = require('bcryptjs'),
    randomstring = require('randomstring'),
    logger = require('../../utils/logger');

module.exports = function(app) {
    requireRole = function(roles) {
        return function(req, res, next) {
            delete req.session.lastUnauthPage;
            if (roles !== null) {
                if (req.user) {
                    req.user.getRoles().then(function(userRoles) {
                        for (var i = 0, iLen = userRoles.length; i < iLen; i++) {
                            for (var j = 0, jLen = roles.length; j < jLen; j++) {
                                if (userRoles[i].name === roles[j]) {
                                    return next();
                                }
                            }
                        }
                        req.session.lastUnauthPage = req.path;
                        res.redirect('/login');
                    });
                } else {
                    req.session.lastUnauthPage = req.path;
                    res.redirect('/login');
                }
            } else {
                if (req.user) {
                    return next();
                } else {
                    req.session.lastUnauthPage = req.path;
                    res.redirect('/login');
                }
            }
        };
    };

    sendSignupMail = function(req, user) {
        var usrid = crypto.createHash('md5').update(user.salt + user.email).digest('hex');
        return sendMail({
            to: user.email,
            subject: req.i18n.__("signup_notification_mail_subject"),
            text: req.i18n.__("signup_notification_mail_text_body",
                user.login, getApplicationBaseURL() + "/activate?id=" + usrid),
            html: req.i18n.__("signup_notification_mail_html_body",
                user.login, getApplicationBaseURL() + "/activate?id=" + usrid)
        }).then(function() {
            logger.info("Activation mail sent to " + user.email);
		});
    };

    sendPasswordResetConfirmMail = function(req, user) {
        var usrid = crypto.createHash('md5').update(user.salt + user.email).digest('hex');
        return sendMail({
            to: user.email,
            subject: req.i18n.__("password_reset_confirm_mail_subject"),
            text: req.i18n.__("password_reset_confirm_mail_text_body",
                user.login, getApplicationBaseURL() + "/pwd_reset/confirm?id=" + usrid),
            html: req.i18n.__("password_reset_confirm_mail_html_body",
                user.login, getApplicationBaseURL() + "/pwd_reset/confirm?id=" + usrid)
        }).then(function() {
            logger.info("Reset password confirm mail sent to user with mail " + user.email + " and id " + user.id);
		});
    };

    sendPasswordResetMail = function(req, user, password) {
        return sendMail({
            to: user.email,
            subject: req.i18n.__("password_reset_mail_subject"),
            text: req.i18n.__("password_reset_mail_text_body",
                user.login, password, getApplicationBaseURL() + "/profile"),
            html: req.i18n.__("password_reset_mail_html_body",
                user.login, password, getApplicationBaseURL() + "/profile")
        }).then(function() {
            logger.info("Reset password mail sent to user with mail " + user.email + " and id " + user.id);
		});
    };

    activateUser = function(userid) {
        return models.User.find({
            where: models.Sequelize.where(
                models.Sequelize.fn('md5', models.Sequelize.fn('concat', models.Sequelize.col('salt'), models.Sequelize.col('email'))),
                userid
            )
        }).then(function(user) {
            if (!user) {
                throw new Error('Requested user activation with hash of non existent user: ' + userid);
            }
            user.activated = true;
            return user.save();
        });
    };
};
