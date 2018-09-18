var util = require('util'),
    winston = require('winston'),
    expressLogger = require('express').logger,
    loggingLevels = {
        levels: {
            emerg: 0,
            alert: 1,
            crit: 2,
            error: 3,
            warn: 4,
            notice: 5,
            info: 6,
            debug: 7
        },
        colors: {
            emerg: 'grey',
            alert: 'magenta',
            crit: 'magenta',
            error: 'red',
            warn: 'yellow',
            notice: 'blue',
            info: 'green',
            debug: 'white'
        }
    };
winston.addColors(loggingLevels.colors);
winston.transports.FileSoleLevel = function(options) {
    this.soleLevel = options.level || 'info';
    this.realLogger = new winston.transports.File(options);
};
util.inherits(winston.transports.FileSoleLevel, winston.Transport);
winston.transports.FileSoleLevel.prototype.log = function(level, msg, meta, callback) {
    if (level !== this.soleLevel) {
        return callback(null, true);
    } else {
        this.realLogger.log(level, msg, meta, callback);
    }
};

var transports = {
    'file-problems': new winston.transports.File({
        name: 'file-problems',
        level: 'warn',
        filename: './logs/emapic-problems.log',
        handleExceptions: true,
        humanReadableUnhandledException: true,
        json: true,
        maxsize: 5242880, //5MB
        maxFiles: 10,
        colorize: false
    }),
    'file-info': new winston.transports.FileSoleLevel({
        name: 'file-info',
        level: 'info',
        filename: './logs/emapic-info.log',
        handleExceptions: false,
        json: true,
        maxsize: 5242880, //5MB
        maxFiles: 10,
        colorize: false
    }),
    'file-requests': new winston.transports.File({
        name: 'file-requests',
        level: 'info',
        filename: './logs/emapic-requests.log',
        handleExceptions: false,
        json: true,
        maxsize: 52428800, //50MB
        maxFiles: 10,
        colorize: false
    }),
    'console': new winston.transports.Console({
        name: 'console-all',
        level: 'debug',
        handleExceptions: true,
        json: false,
        colorize: true,
        timestamp: true
    })
};

module.exports = winston.loggers.internal = new (winston.Logger)({
    levels: loggingLevels.levels,
    transports: [
        transports['file-problems'],
        transports['file-info'],
        transports.console
    ],
    exitOnError: false,
    emitErrs: false
});

var requestsLogger = winston.loggers.requests = new (winston.Logger)({
    levels: loggingLevels.levels,
    transports: [
        transports['file-requests'],
        transports.console
    ],
    exitOnError: false,
    emitErrs: false
});

expressLogger.token('user-agent', function (req, res) {
    return ('user-agent' in req.headers && req.headers['user-agent'] !== null) ? req.headers['user-agent'].replace(/"/g, '\\"') : null;
});

expressLogger.token('remote-user', function (req, res) {
    return req.user ? req.user.id : '-';
});

module.exports.stream = {
    write: function(message, encoding) {
        var json;
        try {
            json = JSON.parse(message);
        } catch (ex) {
            winston.loggers.internal.error('Error while parsing HTTP request: ' + ex + ' || Message: ' + message);
            return;
        }
        if (json.remote_addr !== '127.0.0.1' && json.remote_addr !== 'localhost') {
            requestsLogger.info('Web request info', json);
        } else {
            requestsLogger.debug('Localhost web request info', json);
        }
    }
};
