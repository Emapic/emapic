var util = require('util'),
    winston = require('winston');

winston.transports.FileSoleLevel = function(options) {
    this.soleLevel = options.level || 'info';
    this.realLogger = new winston.transports.File(options);
};
util.inherits(winston.transports.FileSoleLevel, winston.Transport);
winston.transports.FileSoleLevel.prototype.log = function(level, msg, meta, callback) {
    if (level != this.soleLevel) {
        callback(null, true);
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
        level: 'verbose',
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

module.exports = winston.loggers.internal = new winston.Logger({
    transports: [
        transports['file-problems'],
        transports['file-info'],
        transports.console
    ],
    exitOnError: false,
    emitErrs: false
});

var requestsLogger = winston.loggers.requests = new winston.Logger({
    transports: [
        transports['file-requests'],
        transports.console
    ],
    exitOnError: false,
    emitErrs: false
});

module.exports.stream = {
    write: function(message, encoding){
        requestsLogger.verbose('Web request info', JSON.parse(message));
    }
};
