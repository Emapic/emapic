// utils.js/
var nodemailer = require('nodemailer'),
    fs = require('fs'),
    smtpTransport = require('nodemailer-smtp-transport'),
    nconf = require('nconf'),
    Promise = require('bluebird'),
    url = require('url'),
    pagination = require('pagination'),
    logger = require('./utils/logger'),
    bases = require('bases'),
    path = require('path'),
    imageType = require('image-type'),
    request = require('request'),
    childProcess = Promise.promisifyAll(require('child_process')),
    optipng = require('optipng-bin'),
    phantomjs = require('phantomjs-prebuilt'),
    surveyIdEncr = nconf.get('app').surveyIdEncr,
    smtpConfig = nconf.get('smtp'),
    fileType = require('file-type'),
    readChunk = require('read-chunk');

function takeSnapshotRaw(url, imgPath, width, height, wait, minSize, tries) {
    tries = (tries) ? tries : 0;
    var childArgs = [
            '--ignore-ssl-errors=true',
            path.join(__dirname, 'scripts' + path.sep + 'phantomjs-survey_snapshot.js'),
            url,
            imgPath,
            width,
            height,
            wait
        ];
    return childProcess.execFileAsync(phantomjs.path, childArgs).then(function(stdout) {
        if (!minSize || fs.statSync(imgPath).size >= minSize) {
            return Promise.resolve(imgPath);
        } else {
            // If the image file is very small, it probably wasn't well rendered,
            if (tries >= 3) {
                // If we already tried the process at least 3 times, we simply inform of the anomaly
                logger.warn('Snapshot from url ' + url + ' has an unusual small size and could be wrong.');
                return Promise.resolve(imgPath);
            } else {
                // We retry the process (2 more times at most)
                logger.debug('Snapshot from url ' + url + ' seems to be wrong. Retrying...');
                return takeSnapshotRaw(url, imgPath, width, height, wait, minSize, tries + 1);
            }
        }
    });
}

module.exports = function(app) {
    Utils = {
        encryptSurveyId: function(id) {
            return (id) ? bases.toBase(id * surveyIdEncr.factor, surveyIdEncr.base ) : null;
        },

        decryptSurveyId: function(encrId) {
            for (var i=0, len=encrId.length; i<len; i++) {
                if (bases.KNOWN_ALPHABETS[surveyIdEncr.base].indexOf(encrId[i]) === -1) {
                    return null;
                }
            }
            return (encrId) ? bases.fromBase62(encrId, surveyIdEncr.base) / surveyIdEncr.factor : null;
        },

        sendMail: function(mail) {
            if (typeof mail.from === 'undefined') {
                mail.from = smtpConfig.from;
            }
            var transporter = nodemailer.createTransport(smtpTransport({
                host: smtpConfig.host,
                port: smtpConfig.port,
                ignoreTLS: true,
                tls: {
                    rejectUnauthorized: false
                },
                secure: true,
                auth: {
                    user: smtpConfig.user,
                    pass: smtpConfig.pass
                }
            }));
            return new Promise(function(resolve, reject) {
                transporter.sendMail(mail, function(error, info){
                    if (error){
                        logger.error('SMTP error: ' + error);
                        return reject(error);
                    }
                    return resolve();
                });
            });
        },

        getPaginationBasePath: function(req) {
            var dir = url.parse(req.url).pathname + '?';
            for (var i in req.query) {
                if (i !== 'page') {
                    dir += i + '=' + req.query[i] + '&';
                }
            }
            return dir;
        },

        getPaginationTranslations: function(req) {
            return {
                'NEXT': req.i18n.__('pagination_next'),
                'PREVIOUS': req.i18n.__('pagination_previous'),
                'FIRST': req.i18n.__('pagination_first'),
                'LAST': req.i18n.__('pagination_last')
            };
        },

        paginationTemplate: function(elementName) {
            return function(result) {
                function getPrevNextLink(prelink, url, next) {
                    return '<li class="pagination-' + (next ? 'next' : 'previous') + (url ? '' : ' disabled') + '"><a' + (url ? ' href="' + prelink + url + '"' : '') + '><span class="glyphicon glyphicon-menu-' + (next ? 'right' : 'left') + '"></span></a></li>';
                }
                var i, len, prelink;
                var html = '<div class="col-xs-12 pagination-container"><ul class="pagination">';
                if (result.pageCount < 2) {
                    html += '</ul><span class="col-xs-12 pagination-totals">' + result.totalResult + ' ' + elementName + '</span></div>';
                    return html;
                }
                prelink = this.preparePreLink(result.prelink);
                html += getPrevNextLink(prelink, result.previous, false);
                if (result.previous && result.range[0] !== result.first) {
                    html += '<li class="pagination-first"><a href="' + prelink + result.first + '">' + result.first + '</a></li>' +
                    (result.range[0] - 1 !== result.first ? '<li class="pagination-more-before disabled"><a></a></li>' : '');
                }
                if (result.range.length) {
                    for( i = 0, len = result.range.length; i < len; i++) {
                        html += '<li'
                        if (result.range[i] === result.current) {
                            html += ' class="active"';
                        }
                        html += '><a href="' + prelink + result.range[i] + '">' + result.range[i] + '</a></li>';
                    }
                }
                if (result.next && result.range[result.range.length - 1] !== result.last) {
                    html += (result.range[result.range.length - 1] + 1 !== result.last ? '<li class="pagination-more-after disabled"><a></a></li>' : '') +
                    '<li class="pagination-last' + (result.next ? '' : ' disabled') + '"><a href="' + prelink + result.last + '">' + result.last + '</a></li>';
                }
                html += getPrevNextLink(prelink, result.next, true);
                if (elementName) {
                    html += '</ul><span class="col-xs-12 pagination-totals">' + result.totalResult + ' ' + elementName + '</span></div>';
                }
                return html;
            };
        },

        getPaginationHtml: function(req, pageNr, pageSize, totalResults, elementName) {
            return new pagination.TemplatePaginator({
                prelink: Utils.getPaginationBasePath(req),
                current: pageNr,
                rowsPerPage: pageSize,
                totalResult: totalResults,
                translator: function(str) {
                    return req.i18n.__('pagination_' + str);
                },
                template: Utils.paginationTemplate(req.i18n.__(elementName))
            }).render();
        },

        copyBodyToLocals: function(req, res) {
            Utils.copyAttributes(req.body, res.locals);
        },

        copyAttributes: function(origin, dest) {
            for (var i in origin) {
                if ({}.hasOwnProperty.call(origin, i)) {
                    dest[i] = origin[i];
                }
            }
            return dest;
        },

        extractProperties: function(object, deleteFields) {
            var props = Utils.copyAttributes(object.get(), {});
            for (var i = 0, len = deleteFields.length; i<len; i++) {
                delete props[deleteFields[i]];
            }
            return props;
        },

        takeSnapshot: function(url, imgPath, width, height, wait, minSize) {
            return takeSnapshotRaw(url, imgPath, width, height, wait, minSize).then(function() {
                // Compress the image content
                return childProcess.execFileAsync(optipng, [
                        '-o7',
                        '-clobber',
                        imgPath
                    ]);
            }).return(imgPath);
        },

        getRandomInt: function(min, max) {
            return Math.floor(Math.random() * (max - min + 1)) + min;
        },

        checkUrlIsImage: function(url) {
            if (url.lastIndexOf('http', 0) !== 0) {
                url = 'http://' + url;
            }
            return new Promise(function(resolve, reject) {
                request({
                    url: url,
                    timeout: 4000
                }).on('response', function(res) {
                    res.on('data', function(chunk) {
                        res.destroy();
                        if (imageType(chunk) !== null) {
                            resolve();
                        } else {
                            reject();
                        }
                    });
                }).on('error', function(err) {
                    if (err.code === 'ETIMEDOUT') {
                        logger.warn('Couldn\'t check whether the URL "' + url + '" is actually an image due to connection timeout. Will accept it as one.');
                        return resolve()
                    }
                    reject(err);
                });
            });
        },

        transformNewlinesToHtml: function(text) {
            return text.replace(/(?:\r\n|\r|\n)/g, '<br/>');
        },

        langToWebLocaleIso: function(lang) {
            switch(lang) {
                case 'en':
                    // We use United Kingdom as reference for english
                    return 'gb';
                case 'gl':
                    // Galician language iso code is different from the region iso code
                    return 'es-ga';
                default:
                    return lang;
            }
        },

        getApplicationBaseURL: function() {
            return 'https://' + nconf.get('server').domain;
        },

        getFileMetadata: function(input) {
            return fileType(Buffer.isBuffer(input) ? input : readChunk.sync(input, 0, 4100));
        },

        getFileMimeType: function(input, defaultMime) {
            var metadata = Utils.getFileMetadata(input);
            return metadata === null ?
                (defaultMime ? defaultMime : 'application/octet-stream') : metadata.mime;
        },

        getFileType: function(input) {
            var metadata = Utils.getFileMetadata(input);
            return metadata === null ? null : metadata.mime.split('/')[0];
        },

        isImage: function(input) {
            return Utils.getFileType(input) === 'image';
        },

        isVideo: function(input) {
            return Utils.getFileType(input) === 'video';
        },

        deleteTmpFilesFromRequest: function(req) {
            var paths = [];
            for (var name in req.files) {
                if ({}.hasOwnProperty.call(req.files, name)) {
                    paths.push(req.files[name].path);
                }
            }
            if (paths.length > 0) {
                paths.map(fs.unlink);
                logger.debug('Successfully deleted the following tmp files: ' + paths.join(' | '));
            }
        },

        dontDeleteTmpFiles: function() {
            return function(req, res, next) {
                res.__deleteFilesOnFinished = false;
                return next();
            }
        }
    };
};
