var passport = require('passport'),
    LocalStrategy = require('passport-local').Strategy,
    GoogleStrategy = require('passport-google-oauth').OAuth2Strategy,
    FacebookStrategy = require('passport-facebook').Strategy,
    RememberMeStrategy = require('passport-remember-me').Strategy,
    nconf = require('nconf'),
    bcrypt = require('bcryptjs'),
    Promise = require('bluebird'),
    imgRequest = Promise.promisifyAll(require('request').defaults({ encoding: null }), {multiArgs: true}),
    randomstring = require('randomstring'),
    fs = require('fs'),
    oauthserver = require('express-oauth-server'),
    logger = require('../../utils/logger'),
    utils = require('./utils_auth'),
    sequelize = models.sequelize;

module.exports = function(app) {
    utils(app);

    var oauthConfig = nconf.get('app').oAuth;

    app.oauthUrl = '/oauth/token';

    if (oauthConfig.active === true) {
        var oauthParams = {
            useErrorHandler: true,
            grants: ['password', 'refresh_token'],
            model: {
                getAccessToken: function(accessToken) {
                    return sequelize.query('SELECT * FROM oauth2.access_tokens WHERE token = ?;', {
                        replacements: [accessToken],
                        type: sequelize.QueryTypes.SELECT
                    }).then(function(features) {
                        if (features.length > 0) {
                            return models.User.findById(features[0].user_id).then(function(usr) {
                                return {
                                    accessToken: features[0].token,
                                    accessTokenExpiresAt: features[0].expiration_date,
                                    client: {id: features[0].client_id},
                                    user: usr
                                };
                            });
                        }
                        return false;
                    });
                },
                getClient: function (clientId, clientSecret) {
                    return sequelize.query('SELECT * FROM oauth2.clients WHERE client_id = ? AND client_secret = ?;', {
                        replacements: [clientId, clientSecret],
                        type: sequelize.QueryTypes.SELECT
                    }).then(function(features) {
                        if (features.length > 0) {
                            features[0].grants = features[0].grants.split(',');
                            return features[0];
                        }
                        return false;
                    });
                },
                getRefreshToken: function (token) {
                    return sequelize.query('SELECT * FROM oauth2.refresh_tokens WHERE token = ?;', {
                        replacements: [token],
                        type: sequelize.QueryTypes.SELECT
                    }).then(function(features) {
                        if (features.length > 0) {
                            return {
                                refreshToken: features[0].token,
                                refreshTokenExpiresAt: features[0].expiration_date,
                                client: {id: features[0].client_id},
                                user: {id: features[0].user_id}
                            };
                        }
                        return false;
                    });
                },
                getUser: function(username, password) {
                    return localAuth(username, password);
                },
                saveToken: function(token, client, user) {
                    return Promise.join(
                        sequelize.query('INSERT INTO oauth2.access_tokens(token, expiration_date, client_id, user_id) VALUES (?, ?, ?, ?);', {
                            replacements: [token.accessToken, token.accessTokenExpiresAt, client.id, user.id],
                            type: sequelize.QueryTypes.INSERT
                        }),
                        sequelize.query('INSERT INTO oauth2.refresh_tokens(token, expiration_date, client_id, user_id) VALUES (?, ?, ?, ?);', {
                            replacements: [token.refreshToken, token.refreshTokenExpiresAt, client.id, user.id],
                            type: sequelize.QueryTypes.INSERT
                        }),
                        function() {
                            return {
                                accessToken: token.accessToken,
                                accessTokenExpiresAt: token.accessTokenExpiresAt,
                                refreshToken: token.refreshToken,
                                refreshTokenExpiresAt: token.refreshTokenExpiresAt,
                                client: {
                                    id: client.id
                                },
                                user: {
                                    id: user.id
                                }
                            };
                        }
                    );
                },
                revokeToken: function (token) {
                    return sequelize.query('DELETE FROM oauth2.refresh_tokens WHERE token = ?;', {
                        replacements: [token.refreshToken],
                        type: sequelize.QueryTypes.BULKDELETE
                    }).then(function(features) {
                        return features > 0;
                    });
                },
                generateAccessToken: function(client, user, scope) {
                    return generateUniqueOauth2Token(false);
                },
                generateRefreshToken: function(client, user, scope) {
                    return generateUniqueOauth2Token(true);
                }
            }
        };

        if (oauthConfig.accessTokenLifetime !== null && !isNaN(oauthConfig.accessTokenLifetime)) {
            oauthParams.accessTokenLifetime = oauthConfig.accessTokenLifetime;
        }

        if (oauthConfig.refreshTokenLifetime !== null && !isNaN(oauthConfig.refreshTokenLifetime)) {
            oauthParams.refreshTokenLifetime = oauthConfig.refreshTokenLifetime;
        }

        app.oauth = new oauthserver(oauthParams);

        app.post(app.oauthUrl, function(req, res, next) {
            return app.oauth.token()(req, res, function(err) {
                if (err) {
                    if (err.name === 'server_error') {
                        logger.error('Internal server error during API request: ' + err.message);
                        return res.status(500).json({ error_code: 'internal_error', error: 'an internal server error has occured.' });
                    }
                    if (err.statusCode !== undefined && err.name !== undefined && err.message !== undefined) {
                        return res.status(err.statusCode).json({ error_code: err.name, error: err.message });
                    }
                }
                return next(err);
            });
        });
    }

    app.get('/pwd_reset', function(req, res){
        if (req.user) {
            res.redirect('/');
        } else {
            res.render('password-reset', {layout: 'layouts/main'});
        }
    });

    app.get('/resend_activation', function(req, res){
        if (req.user) {
            res.redirect('/');
        } else {
            res.render('resend-activation-mail', {layout: 'layouts/main'});
        }
    });

    //sends the request through our local login/signin strategy, and if successful takes user to homepage, otherwise returns them to signin page
    app.post('/login',
        passport.authenticate('local', {
            failureRedirect: '/login'
        }), function(req, res, next) {
            // issue a remember me cookie if the option was checked
            if (!req.body.remember_me) { return next(); }

            issueToken(req.user, function(err, token) {
                if (err) { return done(err); }
                res.cookie('remember_me', token, { path: '/', httpOnly: true, maxAge: 604800000 }); // 7 days
                return next();
            });
        }, function(req, res) {
            // If this function gets called, authentication was successful.
            res.redirect(req.session.lastUnauthPage ? req.session.lastUnauthPage : '/dashboard');
        }
    );

    //logs user out of site, deleting them from the session, and returns to homepage
    app.get('/logout', function(req, res){
      if (req.user) {
          var email = req.user.email;
          logger.debug("Logging out: " + email);
          req.logout();
      }
      res.clearCookie('remember_me');
      res.redirect('/');
    });

    app.post('/signup',  function(req, res) {
        if (!req.body.email ||
            !req.body.login ||
            !req.body.password) {
            copyBodyToLocals(req, res);
            return res.render('signup', {layout: 'layouts/main'});
        }

        if (!/^[A-Za-z0-9_.\-~]+$/.test(req.body.login)) {
            req.session.error = 'username_invalid_error_msg';
            copyBodyToLocals(req, res);
            return res.render('signup', {layout: 'layouts/main'});
        }

        var user = {
            salt : randomstring.generate(),
            email : req.body.email.substring(0, 200).trim(),
            login : req.body.login.substring(0, 25).trim(),
            name : (req.body.name !== null) ? req.body.name.substring(0, 100).trim() : null,
            password : req.body.password.substring(0, 50).trim(),
            url : (req.body.url ? req.body.url.substring(0, 300).trim() : null),
            accept_info_email : ('accept_info_email' in req.body)
        };

        if (req.files.avatar) {
            user.avatar = fs.readFileSync(req.files.avatar.path);
        } else {
            user.avatar = null;
        }

        user.password = bcrypt.hashSync(user.salt + user.password, 8);
        if (req.body.lon && req.body.lat) {
            user.geom = {
                type: 'Point',
                coordinates: [ parseFloat(req.body.lon), parseFloat(req.body.lat) ],
                crs: {
                    type: "name",
                    properties: {
                        name: "EPSG:4326"
                    }
                }
            };
        }

        models.User.create(user).then(function(usr) {
            user = usr;
            return sendSignupMail(req, user);
        }).then(function() {
            req.session.success = 'signup_success_msg';
            logger.info("Registered new user with mail " + user.email + " and id " + user.id);
            res.redirect('/');
        }).catch(function(err) {
            if ('id' in user && user.id !== null) {
                user.destroy().then(function() {
                    req.session.error = 'signup_error_msg';
                    logger.error('Error while creating user: ' + err);
                    copyBodyToLocals(req, res);
                    return res.render('signup', {layout: 'layouts/main'});
                });
            } else {
                if (err && err.name === 'SequelizeUniqueConstraintError' &&
                    ((err.errors && err.errors.constructor === Array && err.errors[0].path === 'email') ||
                    (err.message.indexOf('users_email_key') > -1))) {
                    req.session.error = 'email_duplicated_error_msg';
                    logger.debug('E-mail already exists: ' + err);
                } else if (err && err.name === 'SequelizeUniqueConstraintError' &&
                    ((err.errors && err.errors.constructor === Array && err.errors[0].path === 'login') ||
                    (err.message.indexOf('users_login_key') > -1))) {
                    req.session.error = 'username_duplicated_error_msg';
                    logger.debug('Login already in use: ' + err);
                } else {
                    req.session.error = 'signup_error_msg';
                    logger.error('Error while creating user: ' + err);
                }
                copyBodyToLocals(req, res);
                return res.render('signup', {layout: 'layouts/main'});
            }
        });
    });

    app.get('/activate', function(req, res) {
        if (!req.query.id) {
            return res.redirect('/');
        }
        activateUser(req.query.id).then(function(user){
            req.session.success = 'user_activated_msg';
            logger.info("Sucessfully activated user with mail " + user.email + " and id " + user.id);
        }).catch(function (err){
            logger.error('Error while activating user: ' + err);
        }).lastly(function() {
            res.redirect('/login');
        });
    });

    app.post('/profile/delete', function(req, res) {
        var user = req.user;
        req.user.destroy().then(function() {
            req.logout();
            req.session.success = 'delete_user_success_msg';
            logger.info("Sucessfully deleted user with mail " + user.email + " and id " + user.id);
            res.redirect('/');
        }).catch(function(err) {
            req.session.error = 'delete_user_error_msg';
            logger.error('Error while deleting user with mail ' + user.email + ' and id ' + user.id + ': ' + err);
            res.redirect('/profile');
        });
    });

    app.post('/profile/unlink', function(req, res) {
        var user = req.user;
        if (!req.body.service || !req.body.id || req.user.password === null) {
            return res.redirect('/profile');
        }
        switch (req.body.service) {
            case 'google':
                if (req.body.id !== user.google_id) {
                    return res.redirect('/profile');
                }
                user.google_id = null;
                user.google_token = null;
                break;
            case 'facebook':
                if (req.body.id !== user.facebook_id) {
                    return res.redirect('/profile');
                }
                user.facebook_id = null;
                user.facebook_token = null;
                break;
            default:
                return res.redirect('/profile');
        }
        user.save().then(function(user) {
            req.session.success = 'unlink_ext_account_success_msg';
            logger.info("Sucessfully unlinked service " + req.body.service + " from user account with email " + user.email + " and id " + user.id);
        }).catch(function(err) {
            req.session.success = 'unlink_ext_account_error_msg';
            logger.error("Error while unlinking service " + req.body.service + " from user account with email " + user.email + " and id " + user.id + ": " + err);
        }).lastly(function() {
            res.redirect('/profile');
        });
    });

    app.post('/profile', function(req, res) {
        // Checking for the very suspicious case when the posted email
        // is different from the one logged in
        if (req.user.email !== req.body.email) {
            logger.warn("Trying to update an user profile different from the one logged in.");
            req.session.error = 'update_user_error_msg';
            copyAttributes({
                userFormData: req.body
            }, res.locals);
            return res.render('profile', {layout: 'layouts/main'});
        }
        if (req.body.new_password) {
            // If a new password was posted, then it's a password update
            var promise;
            if (req.user.password !== null) {
                // If the user already has a password, we check it first
                promise = localAuth(req.body.email, req.body.password).then(function (user) {
                    if (user) {
                        user.salt = randomstring.generate();
                        user.password = bcrypt.hashSync(user.salt + req.body.new_password.substring(0, 50).trim(), 8);
                        return user.save();
                    }
                    return Promise.resolve(null);
                });
            } else {
                // If the user has no password, we simply save it
                req.user.salt = randomstring.generate();
                req.user.password = bcrypt.hashSync(req.user.salt + req.body.new_password.substring(0, 50).trim(), 8);
                promise = req.user.save();
            }
            promise.then(function(user) {
                if (user) {
                    req.session.success = 'update_password_success_msg';
                    logger.info("Sucessfully updated password for user with mail " + user.email + " and id " + user.id);
                } else {
                    req.session.error = 'update_user_wrong_password_msg';
                }
                return res.redirect('/profile');
            }).catch(function(err) {
                logger.error('Error while updating password: ' + err);
                req.session.error = 'update_password_error_msg';
                req.user.reload().then(function() {
                    copyAttributes({
                        userFormData: req.body
                    }, res.locals);
                    return res.render('profile', {layout: 'layouts/main'});
                });
            });
        } else if (req.files && req.files.avatar) {
            // Avatar update
            // Max avatar file size is 250 KB
            if (req.files.avatar.size > 250000) {
                req.session.error = 'avatar_file_too_big_msg';
                res.redirect('/profile');
                return;
            }
            req.user.avatar = fs.readFileSync(req.files.avatar.path);
            req.user.save().then(function(user) {
                req.session.success = 'update_avatar_success_msg';
                logger.info("Sucessfully updated avatar for user with mail " + user.email + " and id " + user.id);
                return res.redirect('/profile');
            }).catch(function(err) {
                req.session.error = 'update_avatar_error_msg';
                logger.error('Error while updating avatar for user with mail ' + user.email + ' and id ' + user.id + ': ', err);
                req.user.reload().then(function() {
                    copyAttributes({
                        userFormData: req.body
                    }, res.locals);
                    return res.render('profile', {layout: 'layouts/main'});
                });
            });
        } else if (req.body.lat && req.body.lon) {
            // User default position update
            var isNull = (req.body.lon === 'null' && req.body.lat === 'null');
            req.user.geom = !isNull ? {
                type: 'Point',
                coordinates: [ parseFloat(req.body.lon), parseFloat(req.body.lat) ],
                crs: {
                    type: "name",
                    properties: {
                        name: "EPSG:4326"
                    }
                }
            } : null;
            req.user.save().then(function(user) {
                if (isNull) {
                    req.session.success = 'delete_user_position_success_msg';
                    logger.info("Sucessfully deleted default position for user with mail " + user.email + " and id " + user.id);
                } else {
                    req.session.success = 'update_user_position_success_msg';
                    logger.info("Sucessfully updated default position for user with mail " + user.email + " and id " + user.id);
                }
                return res.redirect('/profile');
            }).catch(function(err) {
                if (isNull) {
                    req.session.error = 'delete_user_position_error_msg';
                    logger.error('Error while deleting user position for user with mail ' + user.email + ' and id ' + user.id + ': ', err);
                } else {
                    req.session.error = 'update_user_position_error_msg';
                    logger.error('Error while updating user position for user with mail ' + user.email + ' and id ' + user.id + ': ', err);
                }
                req.user.reload().then(function() {
                    copyAttributes({
                        userFormData: req.body
                    }, res.locals);
                    return res.render('profile', {layout: 'layouts/main'});
                });
            });
        } else if (req.body.login) {
            // General profile update
            if (!/^[A-Za-z0-9_.\-~]+$/.test(req.body.login)) {
                req.session.error = 'username_invalid_error_msg';
                copyAttributes({
                    userFormData: req.body
                }, res.locals);
                return res.render('profile', {layout: 'layouts/main'});
            }

            req.user.login = req.body.login.substring(0, 25).trim();
            req.user.url = (req.body.url ? req.body.url.substring(0, 300).trim() : null);
            req.user.name = (req.body.name !== null) ? req.body.name.substring(0, 100).trim() : null;
            req.user.save().then(function(user) {
                req.session.success = 'update_user_success_msg';
                logger.info("Sucessfully updated user with mail " + user.email + " and id " + user.id);
                return res.redirect('/profile');
            }).catch(function(err) {
                if (err && err.name === 'SequelizeUniqueConstraintError' &&
                    ((err.errors && err.errors.constructor === Array && err.errors[0].path === 'login') ||
                    (err.message.indexOf('users_login_key') > -1))) {
                    req.session.error = 'username_duplicated_error_msg';
                    logger.debug('Login already in use: ' + err);
                } else {
                    req.session.error = 'update_user_error_msg';
                    logger.error('Error while updating user with mail ' + user.email + ' and id ' + user.id + ': ' + err);
                }
                req.user.reload().then(function() {
                    copyAttributes({
                        userFormData: req.body
                    }, res.locals);
                    return res.render('profile', {layout: 'layouts/main'});
                });
            });
        } else if (req.body.preferences) {
            // Other preferences update
            req.user.accept_info_email = req.body.accept_info_email = 'accept_info_email' in req.body
            req.user.save().then(function(user) {
                req.session.success = 'update_preferences_success_msg';
                logger.info("Sucessfully updated preferences for user with mail " + user.email + " and id " + user.id);
                return res.redirect('/profile');
            }).catch(function(err) {
                req.session.error = 'update_preferences_error_msg';
                logger.error('Error while updating preferences for user with mail ' + user.email + ' and id ' + user.id + ': ', err);
                req.user.reload().then(function() {
                    copyAttributes({
                        userFormData: req.body
                    }, res.locals);
                    return res.render('profile', {layout: 'layouts/main'});
                });
            });
        } else {
            return res.redirect('/profile');
        }
    });

    app.post('/pwd_reset', function(req, res) {
        if (!req.body.email) {
            return res.redirect('/login');
        }
        var user;
        models.User.find({ where: {email: req.body.email, activated: true} }).then(function(usr) {
            user = usr;
            if (!user) {
                throw new Error('password_reset_invalid_user');
            }
            return sendPasswordResetConfirmMail(req, user);
        }).then(function() {
            req.session.success = "password_reset_confirm_success_msg";
        }).catch({ message: 'password_reset_invalid_user' }, function(err) {
            req.session.error = 'auth_mail_invalid_user_msg';
            logger.debug('Requested password reset for invalid user with mail ' + req.body.email);
        }).catch(function (err){
            req.session.error = 'password_reset_error_msg';
            logger.error('Error while sending reset password confirm mail to user with mail ' + user.email + ' and id ' + user.id + ': ' + err);
        }).lastly(function() {
            res.redirect('/login');
        });
    });

    app.get('/pwd_reset/confirm', function(req, res) {
        if (!req.query.id) {
            return res.redirect('/');
        }
        var password,
            user;
        models.User.find({
            where: models.Sequelize.where(
                models.Sequelize.fn('md5', models.Sequelize.fn('concat', models.Sequelize.col('salt'), models.Sequelize.col('email'))),
                req.query.id
            )
        }).then(function(usr) {
            user = usr;
            if (!user) {
                throw new Error('password_reset_invalid_user');
            }
            user = usr;
            password = randomstring.generate(10);
            user.salt = randomstring.generate();
            user.password = bcrypt.hashSync(user.salt + password, 8);
            return user.save();
        }).then(function(user){
            return sendPasswordResetMail(req, user, password);
        }).then(function(){
            req.session.success = 'password_reset_success_msg';
        }).catch({ message: 'password_reset_invalid_user' }, function(err) {
            req.session.error = 'password_reset_error_msg';
            logger.debug('Requested confirmed password reset for invalid user with hash id ' + req.query.id);
        }).catch(function (err){
            req.session.error = 'password_reset_error_msg';
            logger.error('Error while reseting password of user with mail ' + user.email + ' and id ' + user.id + ': ' + err);
        }).lastly(function() {
            res.redirect('/login');
        });
    });

    app.post('/resend_activation', function(req, res) {
        if (!req.body.email) {
            return res.redirect('/login');
        }
        var user;
        models.User.find({ where: {email: req.body.email} }).then(function(usr) {
            user = usr;
            if (!user) {
                throw new Error('resend_activation_mail_invalid_user');
            }
            if (user.activated) {
                throw new Error('resend_activation_mail_activated_user');
            }
            return sendSignupMail(req, user);
        }).then(function() {
            req.session.success = 'resend_activation_mail_success_msg';
        }).catch({ message: 'resend_activation_mail_invalid_user' }, function(err) {
            req.session.error = 'auth_mail_invalid_user_msg';
            logger.debug('Requested activation mail for invalid user with mail ' + req.body.email);
        }).catch({ message: 'resend_activation_mail_activated_user' }, function(err) {
            req.session.error = 'resend_activation_mail_activated_user_msg';
            logger.debug('Requested activation mail for already activated user with mail ' + req.body.email);
        }).catch(function (err) {
            req.session.error = 'resend_activation_mail_error_msg';
            logger.error('Error while resending activation mail to user with mail ' + user.email + ' and id ' + user.id + ': ' + err);
        }).lastly(function() {
            res.redirect('/login');
        });
    });

    // =====================================
    // GOOGLE ROUTES =======================
    // =====================================
    // send to google to do the authentication
    // profile gets us their basic information including their name
    // email gets their emails
    app.get('/auth/google', passport.authenticate('google', { scope : ['profile', 'email'] }));

    // the callback after google has authenticated the user
    app.get('/auth/google/callback',
        passport.authenticate('google', {
            successRedirect : '/dashboard',
            failureRedirect : '/login'
        })
    );

    // =====================================
    // FACEBOOK ROUTES =======================
    // =====================================
    // send to google to do the authentication
    // profile gets us their basic information including their name
    // email gets their emails
    app.get('/auth/facebook', passport.authenticate('facebook', { scope : ['public_profile', 'email'] }));

    // the callback after google has authenticated the user
    app.get('/auth/facebook/callback',
        passport.authenticate('facebook', {
            successRedirect : '/dashboard',
            failureRedirect : '/login'
        })
    );

    //===============PASSPORT=================
    //used in local signin strategy
    function localAuth(email, password) {
        return models.User.find({ where: {email: email, activated: true} }).then(function(user) {
            if (user === null) {
                // If we don't find it by email, we try by login
                return models.User.find({ where: {login: email, activated: true} });
            }
            return Promise.resolve(user);
        }).then(function(user) {
            if (user === null) {
                logger.debug("Could not find user in db for signin: " + email);
                return Promise.resolve(false);
            }
            if (user.password !== null &&
                bcrypt.compareSync(user.salt + password, user.password)) {
                logger.debug("Passwords match");
                return Promise.resolve(user);
            }
            logger.debug("Passwords don't match");
            return Promise.resolve(false);
        });
    }

    //used in google signin strategy
    function googleAuth (req, profile, token) {
        var usr;
        return models.User.find({ where: { 'google_id' : profile.id } }).then(function(user) {
            if (user === null) {
                // If we don't find it by google id, we try by email
                return models.User.find({ where: {email: profile.emails[0].value} }).then(function(user) {
                    if (user === null) {
                        // If we don't find it either by google id or email, we
                        // create a new user.
                        logger.debug("Could not find user in db for Google signin: " + profile.id + " / " + profile.emails[0].value);
                        usr = {
                            email : profile.emails[0].value,
                            login : profile.emails[0].value.split("@")[0],
                            google_id : profile.id,
                            google_token : token,
                            name : profile.displayName,
                            url : profile.url,
                            activated : true
                        };
                        var avatarPromise;
                        if ('image' in profile._json && 'url' in profile._json.image && !profile._json.image.isDefault) {
                            avatarPromise = imgRequest.getAsync(profile._json.image.url.split('?')[0]).then(function (values) {
                                return Promise.resolve(new Buffer(values[1]));
                            });
                        } else {
                            avatarPromise = Promise.resolve(null);
                        }
                        return avatarPromise.then(function(avatar) {
                            usr.avatar = avatar;
                            return nextLoginUserSignup(usr, 0).then(function(user) {
                                logger.info("Registered new user from Google data with mail " + user.email + " and id " + user.id);
                                req.session.success = 'google_signup_success_msg';
                                return Promise.resolve(user);
                            });
                        });
                    } else {
                        logger.debug("Found user for Google signin by email.");
                        user.google_id = profile.id;
                        user.google_token = token;
                        return user.save().then(function(user) {
                            logger.info("Linked user with mail " + user.email + " and id " + user.id + " with Google id " + user.google_id);
                            req.session.success = 'google_signup_linked_success_msg';
                            return Promise.resolve(user);
                        });
                    }
                });
            } else {
                logger.debug("Found user for Google signin by Google id.");
                return Promise.resolve(user);
            }
        });
    }

    //used in facebook signin strategy
    function facebookAuth (req, profile, token) {
        var usr;
        return models.User.find({ where: { 'facebook_id' : profile.id } }).then(function(user) {
            if (user === null) {
                if (!('emails' in profile) || profile.emails.length === 0) {
                    throw new Error('facebook_no_mail');
                }
                // If we don't find it by facebook id, we try by email
                return models.User.find({ where: {email: profile.emails[0].value} }).then(function(user) {
                    if (user === null) {
                        // If we don't find it either by facebook id or email, we
                        // create a new user.
                        logger.debug("Could not find user in db for Facebook signin: " + profile.id + " / " + profile.emails[0].value);
                        usr = {
                            email : profile.emails[0].value,
                            login : (profile.username) ? profile.username : profile.emails[0].value.split("@")[0],
                            facebook_id : profile.id,
                            facebook_token : token,
                            name : profile.displayName,
                            url : profile.profileUrl,
                            activated : true
                        };
                        var avatarPromise;
                        if ('picture' in profile._json && 'data' in profile._json.picture &&
                            !profile._json.picture.data.is_silhouette && 'url' in profile._json.picture.data) {
                            avatarPromise = imgRequest.getAsync(profile._json.picture.data.url).then(function (values) {
                                return Promise.resolve(new Buffer(values[1]));
                            });
                        } else {
                            avatarPromise = Promise.resolve(null);
                        }
                        return avatarPromise.then(function(avatar) {
                            usr.avatar = avatar;
                            return nextLoginUserSignup(usr, 0).then(function(user) {
                                logger.info("Registered new user from Facebook data with mail " + user.email + " and id " + user.id);
                                req.session.success = 'facebook_signup_success_msg';
                                return Promise.resolve(user);
                            });
                        });
                    } else {
                        logger.debug("Found user for Facebook signin by email.");
                        user.facebook_id = profile.id;
                        user.facebook_token = token;
                        return user.save().then(function(user) {
                            logger.info("Linked user with mail " + user.email + " and id " + user.id + " with Facebook id " + user.facebook_id);
                            req.session.success = 'facebook_signup_linked_success_msg';
                            return Promise.resolve(user);
                        });
                    }
                });
            } else {
                logger.debug("Found user for Facebook signin by Facebook id.");
                return Promise.resolve(user);
            }
        });
    }

    function nextLoginUserSignup(user, tryNr) {
        var originalLogin = user.login;
        user.login += (tryNr > 0) ?  tryNr : '';
        return models.User.create(user).catch(function(err) {
            if (typeof user.id !== 'undefined' && user.id !== null) {
                return user.destroy().then(function() {
                    throw err;
                });
            } else {
                if (err && err.name === 'SequelizeUniqueConstraintError' &&
                    ((err.errors && err.errors.constructor === Array && err.errors[0].path === 'login') ||
                    (err.message.indexOf('users_login_key') > -1))) {
                    user.login = originalLogin;
                    return nextLoginUserSignup(user, tryNr + 1);
                } else {
                    throw err;
                }
            }
        });
    }



    // Passport session setup.
    passport.serializeUser(function(user, done) {
        done(null, user.id);
    });

    passport.deserializeUser(function(id, done) {
        models.User.findById(id).then(function(user) {
            done(null, user);
        });
    });

    passport.use(new RememberMeStrategy(
        function(token, done) {
            consumeRememberMeToken(token, function (err, id) {
                if (err) { return done(err); }
                models.User.findById(id).then(function(user) {
                    if (!user) { return done(null, false); }
                    return done(null, user);
                });
            });
        },
        issueToken
    ));

    passport.use('local', new LocalStrategy({
        usernameField: 'email',
        passReqToCallback : true}, //allows us to pass back the request to the callback
        function(req, email, password, done) {
            localAuth(email ? email.trim() : email, password ? password.trim() : password)
            .then(function (user) {
                if (user) {
                    logger.debug("Logged in as: " + user.email);
                    done(null, user);
                } else {
                    req.session.error = 'login_wrong_data_msg'; //inform user could not log them in
                    done(null, user);
                }
            }).catch(function (err){
                logger.error('Error while logging in: ' + err);
                req.session.error = 'login_error_msg'; //inform user could not log them in
                done(null, null);
            });
        }
    ));

    var googleConfig = nconf.get('oAuth').google;
    googleConfig.callbackURL = getApplicationBaseURL() + '/auth/google/callback';
    googleConfig.passReqToCallback = true;

    passport.use('google', new GoogleStrategy(googleConfig,
        function(req, token, refreshToken, profile, done) {
            googleAuth(req, profile, token).then(function(user) {
                if (user) {
                    logger.debug("Logged in as: " + user.email);
                    done(null, user);
                } else {
                    req.session.error = 'google_login_error_msg'; //inform user could not log them in
                    done(null, user);
                }
            }).catch(function (err){
                logger.error('Error while logging in with Google: ' + err);
                req.session.error = 'google_login_error_msg'; //inform user could not log them in
                done(null, null);
            });
        }
    ));

    var facebookConfig = nconf.get('oAuth').facebook;
    facebookConfig.callbackURL = getApplicationBaseURL() + '/auth/facebook/callback';
    facebookConfig.passReqToCallback = true;
    facebookConfig.profileFields = ['id', 'name', 'emails', 'displayName', 'profileUrl', 'picture.type(large)'];

    passport.use('facebook', new FacebookStrategy(facebookConfig,
        function(req, token, refreshToken, profile, done) {
            facebookAuth(req, profile, token).then(function(user) {
                if (user) {
                    logger.debug("Logged in as: " + user.email);
                    done(null, user);
                } else {
                    req.session.error = 'facebook_login_error_msg'; //inform user could not log them in
                    done(null, user);
                }
            }).catch(function (err){
                if (err.message === 'facebook_no_mail') {
                    logger.debug('Facebook did not return an email for user with id: ' + profile.id);
                    req.session.error = 'facebook_no_email_login_error_msg'; //inform user he/she must share the email
                } else {
                    logger.error('Error while logging in with Facebook: ' + err);
                    req.session.error = 'facebook_login_error_msg'; //inform user could not log them in
                }
                done(null, null);
            });
        }
    ));

    function issueToken(user, done) {
        var token = randomstring.generate(64);
        saveRememberMeToken(token, user.id, function(err) {
            if (err) { return done(err); }
            return done(null, token);
        });
    }

    /* Fake, in-memory database of remember me tokens */

    var tokens = {};

    function consumeRememberMeToken(token, fn) {
        var uid = tokens[token];
        // invalidate the single-use token
        delete tokens[token];
        return fn(null, uid);
    }

    function saveRememberMeToken(token, uid, fn) {
        tokens[token] = uid;
        return fn();
    }
};
