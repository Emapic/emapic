require('exit-on-epipe');

var express = require('express'),
    FileStore = require('session-file-store')(express.session),
    fs = require('fs'),
    http = require('http'),
    https = require('https'),
    Hogan = require('hjs'),
    hoganExpress = require('hogan-express'),
    path = require('path'),
    slashes = require('connect-slashes'),
    i18n = require('i18n-2'),
    logger = require('./utils/logger'),
    morgan = require('morgan'),
    cookieParser = require('cookie-parser'),
    bodyParser = require('body-parser'),
    methodOverride = require('method-override'),
    passport = require('passport'),
    // Load configuration:
    // First consider commandline arguments and environment variables, respectively,
    // and then load configuration from a designated file
    nconf = require('nconf').argv().env().file({ file: 'config.json' }),
    multiparty = require('connect-multiparty'),
    errorhandler = require('errorhandler'),
    httpErrorHandler = require('express-error-handler'),
    Sitemap = require('express-sitemap'),
    nodeSchedule = require('node-schedule'),
    utils = require('./utils'),
    routes = require('./routes'),
    onFinished = require('on-finished'),
    clamscan = require('clamscan'),
    clamscanConfig = {
        // debug_mode: true,
        clamdscan: {
            config_file: null // Use default config file
        }
    };

require('pg').defaults.parseInt8 = true;

/**
 *  Define the Emapic application.
 */
var EmapicApp = function() {

    //  Scope.
    var self = this,
        serverConfig,
        socialConfig,
        geoConfig,
        avScanner;


    /*  ================================================================  */
    /*  Helper functions.                                                 */
    /*  ================================================================  */

    /**
     *  Load configuration parameters.
     */
    self.loadConfig = function() {
        serverConfig = nconf.get('server');
        socialConfig = nconf.get('social');
        geoConfig = nconf.get('geoServices');
    };

    /**
     *  Generate the sitemap.xml and robots.txt
     */
    self.loadSitemapRobots = function() {
        var sitemap = Sitemap({
            url: serverConfig.domain,
            route: {
                // Never index the API
                '/api/': {
                    disallow: true
                },
                // Hide dynamic elements like thumbnails and surveys
                '/thumbnails/': {
                    hide: true
                },
                '/survey/': {
                    hide: true
                },
                '/answer_img/': {
                    hide: true
                },
                '/avatar/': {
                    hide: true
                },
                // Hide pages that have no actual content
                '/auth/': {
                    hide: true
                },
                '/logout': {
                    hide: true
                },
                '/activate': {
                    hide: true
                },
                // Hide pages that require login
                '/dashboard': {
                    hide: true
                },
                '/profile': {
                    hide: true
                },
                '/avatar': {
                    hide: true
                },
                // Hide all survey pages except the gallery
                '/surveys/': {
                    hide: true
                },
                '/surveys/list': {
                    hide: false
                }
            }
        });

        sitemap.originalXml = sitemap.xml;
        sitemap.xml = function() {
            var route = this.my.route,
                sitemap = this.map
                xmlGenerator = {
                    xml: this.originalXml,
                    my: {
                        url: this.my.url,
                        route: {}
                    },
                    map: this.map
                };

            for (var uri in sitemap) {
                if (uri in route) {
                    continue;
                }
                for (var r in route) {
                    if ({}.hasOwnProperty.call(route, r)) {
                        xmlGenerator.my.route[r] = route[r];
                        if (/\/$/.test(r) && uri.lastIndexOf(r, 0) === 0) {
                            xmlGenerator.my.route[uri] = route[r];
                            break;
                        }
                    }
                }
            }

            return xmlGenerator.xml();
        };
        sitemap._XMLwork = sitemap.xml;

        sitemap.originalTxt = sitemap.txt;
        sitemap.txt = function() {
            var route = this.my.route,
                sitemap = this.map
                txtGenerator = {
                    txt: this.originalTxt,
                    my: this.my,
                    map: {}
                };

            for (var r in route) {
                if (route[r].disallow) {
                    txtGenerator.map[r] = route[r];
                }
            }

            return txtGenerator.txt();
        };
        sitemap._TXTwork = sitemap.txt;

        sitemap.generate(self.app, null, true);

        self.app.get('/robots.txt', function (req, res) {
            res.type('text/plain');
            return res.send(serverConfig.robotsHeader + sitemap.txt());
        });

        self.app.get('/sitemap.xml', function (req, res) {
            sitemap.XMLtoWeb(res);
        });
    };

    /**
     *  Set up server IP address and port # using env variables/defaults.
     */
    self.setupVariables = function() {
        //  Set the environment variables we need.
        self.ipaddr = process.env.NODEJS_IP || serverConfig.ipaddr;
        self.httpsport   = process.env.NODEJS_HTTPS_PORT || serverConfig.httpsport;
        self.httpport   = process.env.NODEJS_HTTP_PORT || serverConfig.httpport;
    };


    /**
     *  Populate the cache.
     */
    self.populateCache = function() {
        if (typeof self.zcache === "undefined") {
            //self.zcache = { 'index.html': '' };
        }

        //  Local cache for static content.
        //self.zcache['index.html'] = fs.readFileSync('./index.html');
    };


    /**
     *  Retrieve entry (content) from cache.
     *  @param {string} key  Key identifying content to retrieve from cache.
     */
    self.cache_get = function(key) { return self.zcache[key]; };


    /**
     *  terminator === the termination handler
     *  Terminate server on receipt of the specified signal.
     *  @param {string} sig  Signal to terminate on.
     */
    self.terminator = function(sig){
        if (typeof sig === "string") {
           logger.info('Received %s - terminating app ...', sig);
           process.exit(); // eslint-disable-line no-process-exit
           logger.info('Node server stopped.');
        }
    };


    /**
     *  Setup termination handlers (for exit and a list of signals).
     */
    self.setupTerminationHandlers = function(){
        //  Process on exit and signals.
        process.on('exit', function() { self.terminator(); });

        // Removed 'SIGPIPE' from the list - bugz 852598.
        ['SIGHUP', 'SIGINT', 'SIGQUIT', 'SIGILL', 'SIGTRAP', 'SIGABRT',
         'SIGBUS', 'SIGFPE', 'SIGUSR1', 'SIGSEGV', 'SIGUSR2', 'SIGTERM'
        ].forEach(function(element, index, array) {
            process.on(element, function() { self.terminator(element); });
        });
    };


    /*  ================================================================  */
    /*  App server functions (main app logic here).                       */
    /*  ================================================================  */

    /**
     *  Initialize the server (express) and create the routes and register
     *  the handlers.
     */
    self.initializeServer = function() {

        self.app = express();

        utils(self.app);

        self.app.use(express.cookieParser(serverConfig.secrets.cookie));
        var localeFiles = fs.readdirSync('locales'),
            locales = [],
            localesWithIsos = [];
        for (var i = 0, len = localeFiles.length; i<len; i++) {
            var file = localeFiles[i];
            if (/\.json$/.test(file)) {
                var lang = file.replace(/\.json$/, "");
                locales.push(lang);
                localesWithIsos.push({
                    locale: lang,
                    iso: Utils.langToWebLocaleIso(lang)
                });
            }
        }
        i18n.expressBind(self.app, {
          // setup some locales - other locales default to en silently
          locales: locales,
          extension: '.json',
          // set the cookie name
          cookieName: 'locale',
          // i18n-2 debug messages can clutter the output. Disable them explicitly even in development mode.
          devMode: false
        });
        // Redirect from www-urls to non www-urls
        self.app.use(function(req, res, next) {
            if (req.headers && req.headers.host && req.headers.host.match(/^www/) !== null ) {
                res.writeHead(301, { "Location": req.protocol + '://' + req.headers.host.replace(/^www\./, '') + req.url });
                return res.end();
            }
            return next();
        });
        self.app.use(function(req, res, next) {
            req.i18n.setLocale(req.i18n.preferredLocale());
            req.i18n.setLocaleFromCookie();
            // req.i18n.setLocaleFromQuery();
            res.locals.web_all_locales_with_isos = localesWithIsos;
            res.locals.web_locale = req.i18n.getLocale();
            res.locals.web_locale_iso = Utils.langToWebLocaleIso(res.locals.web_locale);
            var baseLocals = res.locals;
            // Add the i18n function to all rendering contexts
            res.locals.__ = function() {
                return function(text) {
                    return req.i18n.__(text);
                };
            };

            // Add an utility function for url escaping
            res.locals.encodeURIComponent = function() {
                return function(text) {
                    Utils.copyAttributes(baseLocals, this);
                    return encodeURIComponent(Hogan.compile(text).render(this));
                };
            };

            // Hack methods for setting the title in the partials from
            // the children files.
            res.locals.setTitleI18n = function() {
                return function(text) {
                    this.title = req.i18n.__(text);
                };
            };
            res.locals.setTitle = function() {
                return function(text) {
                    this.title = text;
                };
            };

            res.locals.addThisId = ('addThisId' in socialConfig &&
                socialConfig.addThisId !== '') ? socialConfig.addThisId : null;

            res.locals.twitterVia = ('twitterVia' in socialConfig &&
                socialConfig.twitterVia !== '') ? socialConfig.twitterVia : null;

            res.locals.ogSiteName = ('ogSiteName' in socialConfig &&
                socialConfig.ogSiteName !== '') ? socialConfig.ogSiteName : null;

            res.locals.mapboxToken = ('mapboxToken' in geoConfig &&
                geoConfig.mapboxToken !== '') ? geoConfig.mapboxToken : null;

            res.locals.nominatimEmail = ('nominatimEmail' in geoConfig &&
                geoConfig.nominatimEmail !== '') ? geoConfig.nominatimEmail : null;

            next();
        });

        // Add global partials to all rendering contexts
        self.app.set('partials', {
            i18n_emapic_general : 'partials/i18n/emapic_general',
            i18n_emapic_viewer : 'partials/i18n/emapic_viewer',
            base_header: 'partials/base-header',
            header: 'partials/header',
            footer: 'partials/footer',
            navbar: 'partials/navbar',
            surveys_list: 'partials/surveys-list',
            survey_form: 'partials/survey-form',
            survey_form_scripts: 'partials/survey-form-scripts',
            user_menubar: 'partials/user-menubar',
            more_sharing_options_modal: 'partials/more-sharing-options-modal',
            map_header: 'partials/map-header',
            map_simplegeoposwarn: 'partials/map-simplegeoposwarn',
            map_geoposwarn: 'partials/map-geoposwarn',
            map_geoposresult: 'partials/map-geoposresult',
            map_emapic_opinion_popup: 'partials/map-emapic-opinion-popup',
            map_footer: 'partials/map-footer'
        });
        self.app.use(express.static(path.join(__dirname, 'public'), { redirect: false }));
        self.app.use(slashes(false));
        self.app.set('port', self.httpsport);
        self.app.set('ipaddr', self.ipaddr);
        self.app.set('views', path.join(__dirname, 'views'));
        self.app.set('view engine', 'hjs');
        self.app.engine('hjs', hoganExpress);
        self.app.use(express.favicon());
        self.app.use(morgan('{"remote_addr": ":remote-addr", "remote_user": ":remote-user", "method": ":method", "url": ":url", "http_version": ":http-version", "status": ":status", "result_length": ":res[content-length]", "referrer": ":referrer", "user_agent": ":user-agent", "response_time": ":response-time"}',
            { "stream": logger.stream }
        ));
        self.app.use(express.json());
        self.app.use(express.urlencoded());
        self.app.use(multiparty());
        self.app.use(express.methodOverride());
        self.app.use(express.session({
            store: new FileStore({
                path: './.sessions',
                ttl: 18000,
                logFn: logger.info,
                fallbackSessionFn: function(sessionId) {
                    logger.notice('Error while reading session with id "' + sessionId + '". Session will be considered expired.');
                    // Workaround for expiring the session
                    return {cookie: {originalMaxAge: 0 }};
                }
            }),
            secret: serverConfig.secrets.session
        }));
        self.app.use(cookieParser());
        self.app.use(passport.initialize());
        self.app.use(passport.session());
        self.app.use(passport.authenticate('remember-me'));
        // Save OAuth user as the logged in user
        self.app.use(function(req, res, next) {
            var authHeader = req.header('Authorization');
            if (self.app.oauth && req.originalUrl !== self.app.oauthUrl && !req.user &&
              authHeader && authHeader.substring(0, 7) === 'Bearer ') {
                return self.app.oauth.authenticate()(req, res, function(e) {
                    if (e && e.name !== 'unauthorized_request' ) {
                        res.status(e.code);
                        return res.send({ error_code: e.name, error: e.message });
                    }
                    if (res.locals.oauth && res.locals.oauth.token) {
                        req.user = res.locals.oauth.token.user;
                    }
                    return next();
                });
            }
            return next();
        });
        // Delete uploaded files from local temp folder
        self.app.use(function(req, res, next) {
            res.__deleteFilesOnFinished = true;
            onFinished(res, function(err) {
                if (err || res.__deleteFilesOnFinished === true) {
                    Utils.deleteTmpFilesFromRequest(req);
                } else {
                    logger.debug('Don\'t delete tmp files automatically.');
                }
            })
            return next();
        });
        // Scan uploaded files
        if (serverConfig.autoScanFiles === true) {
            avScanner = clamscan(clamscanConfig);
            self.app.use(function(req, res, next) {
                var paths = [],
                    originalFilenames = {};
                for (var name in req.files) {
                    if ({}.hasOwnProperty.call(req.files, name)) {
                        paths.push(req.files[name].path);
                        originalFilenames[req.files[name].path] = req.files[name].originalFilename;
                    }
                }
                if (paths.length === 0) {
                    return next();
                }
                avScanner.scan_files(paths, function(err, goodFiles, badFiles) {
                    // There seems to be some weird bug that might raise an error when
                    // scanning and finding suspicious files, so we must check the
                    // error code for the actual ones
                    if (err && err.code === 2) {
                        logger.error('Error while scanning files: ' + err);
                        return res.send(500);
                    }
                    if (goodFiles.length > 0) {
                        var goodOnes = [];
                        for (var i = 0, iLen = goodFiles.length; i<iLen; i++) {
                            goodOnes.push('"' + goodFiles[i] + '" ("' + originalFilenames[goodFiles[i]] + '")');
                        }
                        logger.debug('The following files have been scanned and deemed innofensive: ' + goodOnes.join(' | '));
                    }
                    if (badFiles.length === 0) {
                        return next();
                    } else {
                        var badOnes = [],
                            metadata = {
                                ip: req.ip,
                                url: req.url,
                                userAgent: req.headers['user-agent'],
                                userId: req.user ? req.user.id : null
                            };
                        for (var j = 0, jLen = badFiles.length; j<jLen; j++) {
                            badOnes.push('"' + badFiles[j] + '" ("' + originalFilenames[badFiles[j]] + '")');
                        }
                        logger.alert('VIRUS WARNING: the following suspicious files have been detected: ' + badOnes.join(' | '), metadata);
                        return res.send(400);
                    }
                });
            });
        }
        // Add the logged user and web protocol+host to all rendering contexts
        self.app.use(function(req, res, next) {
            res.locals.user = req.user;
            res.locals.web_host = req.protocol + '://' + req.get('host');
            next();
        });
        // Add the initial notification and error, if they exist,
        // to all rendering contexts
        self.app.use(function(req, res, next) {
            var render = res.render;
            res.render = function(view, locals, cb) {
                if (req.session.success) {
                    res.locals.success = req.i18n.__(req.session.success);
                    delete req.session.success;
                }
                if (req.session.error) {
                    res.locals.error = req.i18n.__(req.session.error);
                    delete req.session.error;
                }
                render.call(res, view, locals, cb);
            };
            next();
        });
        self.app.use(self.app.router);
        self.app.use(bodyParser.urlencoded({ extended: false }));
        self.app.use(bodyParser.json());

        routes(self.app);

        self.app.use(httpErrorHandler.httpError(404));

        self.app.use(httpErrorHandler({
            handlers: {
                '404': function err404(err, req, res) {
                    logger.warn('404 request: ' + err);
                    res.status(404);
                    if (req.path.lastIndexOf('/api/', 0) === 0) {
                        return res.json({ error_code: 'invalid_url', error: "requested url doesn't exist." });
                    }
                    return res.render('error/404', {
                        title : req.i18n.__('404_title')
                    });
                }
            }
        }));

        // development only
        if ('development' === self.app.get('env')) {
            self.app.use(errorhandler({log: function (err, str, req) {
                logger.error(str + ': ' + err);
            }}));
        }
    };


    /**
     *  Initializes the application.
     */
    self.initialize = function() {
        self.loadConfig();
        self.setupVariables();
        //  self.populateCache();
        self.setupTerminationHandlers();

        // Create the express server and routes.
        self.initializeServer();

        // Create the sitemap and robots routes
        self.loadSitemapRobots();
    };


    /**
     *  Start the server (starts up the application).
     */
    self.start = function() {
        var options = {};
        options.key = serverConfig.ssl.key ? fs.readFileSync(serverConfig.ssl.key) : fs.readFileSync('./test-key.pem');
        options.cert = serverConfig.ssl.cert ? fs.readFileSync(serverConfig.ssl.cert) : fs.readFileSync('./test-cert.pem');
        if (serverConfig.ssl.ca) {
            options.ca = [];
            for (var i = 0, len = serverConfig.ssl.ca.length; i<len; i++) {
                options.ca.push(fs.readFileSync(serverConfig.ssl.ca[i]));
            }
        }
        https.createServer(options, self.app).listen(self.httpsport, self.ipaddr, function(){
            logger.info('Node server started on %s:%d ...', self.ipaddr, self.httpsport);
        });

        if (self.ipaddr !== '127.0.0.1' && self.ipaddr !== '0.0.0.0') {
            // Redirect from http port (80) to https (443)
            http.createServer(function (req, res) {
                res.writeHead(301, { "Location": "https://" + req.headers.host + req.url });
                res.end();
            }).listen(self.httpport, self.ipaddr);
        }

        http.createServer(self.app).listen(3001, '127.0.0.1', function() {
            logger.info('Node localhost server started on %s:%d ...', '127.0.0.1', 3001);
        });

        nodeSchedule.scheduleJob('0 3 * * *', function() {
            logger.info('Updating survey thumbnails...');
            models.Survey.updateAllThumbnails().then(function() {
                logger.info('Survey thumbnails updated.');
            }).catch(function(err) {
                logger.error('Some error happened while updating survey thumbnails: ' + err);
            });
        });

        nodeSchedule.scheduleJob('0 5 * * *', function() {
            deleteExpiredOauth2Tokens();
        });
    };

};

/**
 *  main():  Main code.
 */
var emapic = new EmapicApp();
emapic.initialize();
emapic.start();
