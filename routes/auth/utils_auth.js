// utils_auth.js/
var nodemailer = require('nodemailer'),
    i18n = require('i18n-2'),
    crypto = require('crypto'),
    bcrypt = require('bcryptjs'),
    randomstring = require('randomstring'),
    Promise = require('bluebird'),
    logger = require('../../utils/logger'),
    sequelize = models.sequelize;

module.exports = function(app) {
    requireRole = function(roles, json) {
        return function(req, res, next) {
            delete req.session.lastUnauthPage;
            var allowedPromise;
            if (req.user) {
                allowedPromise = (roles === null) ? Promise.resolve(true) :
                    req.user.getRoles().then(function(userRoles) {
                        for (var i = 0, iLen = userRoles.length; i < iLen; i++) {
                            for (var j = 0, jLen = roles.length; j < jLen; j++) {
                                if (userRoles[i].name === roles[j]) {
                                    return true;
                                }
                            }
                        }
                        return false;
                    });
            } else {
                allowedPromise = Promise.resolve(false);
            }
            return allowedPromise.then(function(allowed) {
                if (allowed) {
                    return next();
                } else {
                    if (json) {
                        return res.status(403).json({ error_code: 'forbidden_access', error: 'you don\'t have the required permissions.' });
                    } else {
                        req.session.lastUnauthPage = req.path;
                        return res.redirect('/login');
                    }
                }
            });
        };
    };

    sendSignupMail = function(req, user) {
        var usrid = crypto.createHash('md5').update(user.salt + user.email).digest('hex');
        return Utils.sendMail({
            to: user.email,
            subject: req.i18n.__("signup_notification_mail_subject"),
            text: req.i18n.__("signup_notification_mail_text_body",
                user.login, Utils.getApplicationBaseURL() + "/activate?id=" + usrid),
            html: req.i18n.__("signup_notification_mail_html_body",
                user.login, Utils.getApplicationBaseURL() + "/activate?id=" + usrid)
        }).then(function() {
            logger.info("Activation mail sent to " + user.email);
		});
    };

    sendPasswordResetConfirmMail = function(req, user) {
        var usrid = crypto.createHash('md5').update(user.salt + user.email).digest('hex');
        return Utils.sendMail({
            to: user.email,
            subject: req.i18n.__("password_reset_confirm_mail_subject"),
            text: req.i18n.__("password_reset_confirm_mail_text_body",
                user.login, Utils.getApplicationBaseURL() + "/pwd_reset/confirm?id=" + usrid),
            html: req.i18n.__("password_reset_confirm_mail_html_body",
                user.login, Utils.getApplicationBaseURL() + "/pwd_reset/confirm?id=" + usrid)
        }).then(function() {
            logger.info("Reset password confirm mail sent to user with mail " + user.email + " and id " + user.id);
		});
    };

    sendPasswordResetMail = function(req, user, password) {
        return Utils.sendMail({
            to: user.email,
            subject: req.i18n.__("password_reset_mail_subject"),
            text: req.i18n.__("password_reset_mail_text_body",
                user.login, password, Utils.getApplicationBaseURL() + "/profile"),
            html: req.i18n.__("password_reset_mail_html_body",
                user.login, password, Utils.getApplicationBaseURL() + "/profile")
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

    deleteExpiredOauth2Tokens = function() {
        logger.info('Deleting expired OAuth2 tokens...');
        var now = new Date();
        return Promise.join(sequelize.query('DELETE FROM oauth2.refresh_tokens WHERE expiration_date < ?;', {
            replacements: [now],
            type: sequelize.QueryTypes.BULKDELETE
        }), sequelize.query('DELETE FROM oauth2.access_tokens WHERE expiration_date < ?;', {
            replacements: [now],
            type: sequelize.QueryTypes.BULKDELETE
        }), function(refreshNr, accessNr) {
            if (refreshNr > 0 || accessNr > 0) {
                logger.info('Deleted expired OAuth2 tokens: ' + refreshNr + ' refresh ones / ' + accessNr + ' access ones.');
            } else {
                logger.info('No expired OAuth2 tokens to delete.');
            }
        });
    };

    generateUniqueOauth2Token = function(isRefresh) {
        var token = randomstring.generate(40);
        return sequelize.query('SELECT count(*) AS nr FROM oauth2.' + (isRefresh ? 'refresh' : 'access') + '_tokens WHERE token = ?;', {
            replacements: [token],
            type: sequelize.QueryTypes.SELECT
        }).then(function(results) {
            return (results[0].nr > 0) ? generateUniqueOauth2Token(isRefresh) : token;
        });
    };
};
