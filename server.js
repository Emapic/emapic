//  OpenShift sample Node application
var express = require('express'),
    FileStore = require('session-file-store')(express.session),
    fs = require('fs'),
    http = require('http'),
    https = require('https'),
    Hogan = require('hjs'),
    path = require('path'),
    slashes = require('connect-slashes'),
    i18n = require('i18n-2'),
    logger = require('./utils/logger'),
    cookieParser = require('cookie-parser'),
    bodyParser = require('body-parser'),
    methodOverride = require('method-override'),
    passport = require('passport'),
    nconf = require('nconf'),
    multiparty = require('connect-multiparty'),
    errorhandler = require('errorhandler'),
    httpErrorHandler = require('express-error-handler');

/**
 *  Define the sample application.
 */
var SampleApp = function() {

    //  Scope.
    var self = this;
    var serverConfig;


    /*  ================================================================  */
    /*  Helper functions.                                                 */
    /*  ================================================================  */

    /**
     *  Load configuration file & parameters.
     */
    self.loadConfig = function() {
        // First consider commandline arguments and environment variables, respectively.
        nconf.argv().env();

        // Then load configuration from a designated file.
        nconf.file({ file: 'config.json' });
        serverConfig = nconf.get('server');
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
           logger.info('Received %s - terminating sample app ...', sig);
           process.exit(1);
        }
        logger.info('Node server stopped.');
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
        self.app.use(express.cookieParser(serverConfig.secrets.cookie));
        i18n.expressBind(self.app, {
          // setup some locales - other locales default to en silently
          locales: ['en', 'es'],
          // set the cookie name
          cookieName: 'locale'
        });
        self.app.use(function(req, res, next) {
          req.i18n.setLocale(req.i18n.preferredLocale());
          req.i18n.setLocaleFromQuery();
          req.i18n.setLocaleFromCookie();
          res.locals.web_locale = req.i18n.getLocale();
          next();
        });
        self.app.use(function(req, res, next) {
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
                    copyAttributes(baseLocals, this);
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
        self.app.engine('hjs', require('hogan-express'));
        self.app.use(express.favicon());
        self.app.use(require('morgan')('{"remote_addr": ":remote-addr", "remote_user": ":remote-user", "method": ":method", "url": ":url", "http_version": ":http-version", "status": ":status", "result_length": ":res[content-length]", "referrer": ":referrer", "user_agent": ":user-agent", "response_time": ":response-time"}',
            { "stream": logger.stream }
        ));
        self.app.use(express.json());
        self.app.use(express.urlencoded());
        self.app.use(multiparty());
        self.app.use(express.methodOverride());
        self.app.use(express.session({
            store: new FileStore({
                path: './.sessions',
                ttl: 18000
            }),
            secret: serverConfig.secrets.session
        }));
        self.app.use(cookieParser());
        self.app.use(passport.initialize());
        self.app.use(passport.session());
        self.app.use(passport.authenticate('remember-me'));
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

        require('./utils')(self.app);
        require('./routes')(self.app);

        self.app.use(httpErrorHandler.httpError(404));

        self.app.use(httpErrorHandler({
            handlers: {
                '404': function err404(err, req, res) {
                    res.status(404);
                    res.render('error/404', {
                        title : req.i18n.__('404_title')
                    });
                }
            }
        }));

        self.app.get('/robots.txt', function (req, res) {
            var robots = fs.readFileSync('robots.txt');
            res.type('text/plain');
            res.send(robots);
        });

        // development only
        if ('development' == self.app.get('env')) {
            self.app.use(errorhandler({log: function (err, str, req) {
                logger.error(str);
            }}));
        }
    };


    /**
     *  Initializes the sample application.
     */
    self.initialize = function() {
        self.loadConfig();
        self.setupVariables();
        //  self.populateCache();
        self.setupTerminationHandlers();

        // Create the express server and routes.
        self.initializeServer();
    };


    /**
     *  Start the server (starts up the sample application).
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

        if (self.ipaddr != '127.0.0.1') {
            // Redirect from http port (80) to https (443)
            http.createServer(function (req, res) {
                res.writeHead(301, { "Location": "https://" + req.headers.host + req.url });
                res.end();
            }).listen(self.httpport, self.ipaddr);
        }

        http.createServer(self.app).listen(3001, '127.0.0.1', function() {
            logger.info('Node localhost server started on %s:%d ...', '127.0.0.1', 3001);
        });

        require('node-schedule').scheduleJob('0 3 * * *', function() {
            logger.info('Generating survey thumbnails...');
            models.Survey.generateThumbnails().then(function() {
                logger.info('Survey thumbnails generated.');
            }).catch(function(err) {
                logger.error('Some error happened while generating survey thumbnails: ' + err);
            });
        });
    };

};

/**
 *  main():  Main code.
 */
var zapp = new SampleApp();
zapp.initialize();
zapp.start();
