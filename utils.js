// utils.js/
var nodemailer = require('nodemailer'),
    fs = require('fs'),
    nconf = require('nconf'),
    Promise = require('bluebird'),
    url = require('url'),
    pagination = require('pagination'),
    logger = require('./utils/logger'),
    bases = require('bases'),
    path = require('path'),
    imageType = require('image-type'),
    isSvg = require('is-svg'),
    i18n = require('i18n-2'),
    request = require('request'),
    childProcess = Promise.promisifyAll(require('child_process')),
    optipng = require('optipng-bin'),
    phantomjs = require('phantomjs-prebuilt'),
    surveyIdEncr = nconf.get('app').surveyIdEncr,
    smtpConfig = nconf.get('smtp'),
    fileType = require('file-type'),
    readChunk = require('read-chunk'),
    tmp = require('tmp'),
    sharp,
    Jimp,
    selectAnImageSVG = '<svg xmlns="http://www.w3.org/2000/svg" height="150px" width="150px" version="1.0" viewBox="-300 -300 600 600" xml:space="preserve"><circle stroke="#AAA" stroke-width="10" r="280" fill="#FFF"/><text style="letter-spacing:1;text-anchor:middle;text-align:center;stroke-opacity:.5;stroke:#000;stroke-width:2;fill:#444;font-size:360px;font-family:Bitstream Vera Sans,Liberation Sans, Arial, sans-serif;line-height:125%;writing-mode:lr-tb;" transform="scale(.2)">{INNER_TEXT}</text></svg>',
    selectAnImageSVGInnerTextOneLine = '<tspan y="180" x="8">{LINE_1}</tspan>',
    selectAnImageSVGInnerTextTwoLines = '<tspan y="-40" x="8">{LINE_1}</tspan><tspan y="400" x="8">{LINE_2}</tspan>';

try {
    require.resolve('sharp');
    sharp = require('sharp');
} catch(e) {
    Jimp = require('jimp');
}

// Add "allSettled" for Bluebird, like "all" but waits for all promises to finish
// before throwing any error (first one found is thrown)
Promise.allSettled = function(promises) {
    return Promise.all(promises.map(function(promise) {
        return promise.reflect();
    })).then(function(inspections) {
        var results = [];
        for (let i = 0, iLen = inspections.length; i<iLen; i++) {
            if (!inspections[i].isFulfilled()) {
                throw inspections[i].reason();
            }
            results.push(inspections[i].value());
        }
        return results;
    });
};

function langToWebLocaleIsoInner(lang) {
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
};

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
            iso: langToWebLocaleIsoInner(lang)
        });
    }
}

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

function transformImageJimp(input, width, height, upscale, format) {
    return Jimp.read(input).then(function(image) {
        var w = (width && (upscale || width < image.bitmap.width)) ? width : Jimp.AUTO,
            h = (height && (upscale || height < image.bitmap.height)) ? height : Jimp.AUTO;
        if (w !== Jimp.AUTO || h !== Jimp.AUTO) {
            image = image.resize(w, h);
        }

        return image;
    });
}

function transformImageSharp(input, width, height, upscale, format) {
    var promise = sharp(input);

    return promise.metadata().then(function(metadata) {
        var w = (width && (upscale || width < metadata.width)) ? width : null,
            h = (height && (upscale || height < metadata.height)) ? height : null,
            options = {
                fit: 'inside'
            };

        // Workaround to make sure the image is in the proper orientation according to EXIF metadata.
        // See: https://stackoverflow.com/questions/48716266/sharp-image-library-rotates-image-when-resizing
        promise = promise.rotate();

        if (w || h) {
            // Don't crop the image when resizing it by both dimensions
            if (w && h) {
                options.fit = 'fill';
            }
            promise = promise.resize(w, h, options);
        }

        if (!format && !sharp.format[metadata.format].output.buffer) {
            format = 'png';
        }

        if (format) {
            promise = promise.toFormat(format);
        }

        return promise;
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
            return (encrId) ? bases.fromBase(encrId, surveyIdEncr.base) / surveyIdEncr.factor : null;
        },

        sendMail: function(mail) {
            if (typeof mail.from === 'undefined') {
                mail.from = smtpConfig.from;
            }
            var transporter = nodemailer.createTransport({
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
            });
            return new Promise(function(resolve, reject) {
                transporter.sendMail(mail, function(error, info){
                    if (error){
                        logger.error('SMTP error: ' + error.toString());
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

        takeSnapshot: function(url, imgPath, nativeWidth, nativeHeight, wait, minSize, retries, imgWidth, imgHeight) {
            imgWidth = imgWidth ? imgWidth : nativeWidth;
            imgHeight = imgHeight ? imgHeight : nativeHeight;
            var tmpFile = tmp.fileSync({ postfix: '.png' });
            return takeSnapshotRaw(url, tmpFile.name, nativeWidth, nativeHeight, wait, minSize).then(function() {
                // Resize the image
                return Utils.transformImage(tmpFile.name, imgWidth, imgHeight, false, 'png', imgPath);
            }).then(function() {
                // Compress the image content
                return childProcess.execFileAsync(optipng, [
                        '-o7',
                        '-clobber',
                        imgPath
                    ]);
            }).finally(function() {
                // Delete the tmp file
                tmpFile.removeCallback();
            }).return(imgPath).catch(function(err) {
                if (retries) {
                    logger.debug('Retrying snapshot take for url "' + url + '" after error: ' + err.toString());
                    return Utils.takeSnapshot(url, imgPath, nativeWidth, nativeHeight, wait, minSize, retries - 1, imgWidth, imgHeight);
                }
                throw err;
            });
        },

        getRandomInt: function(min, max) {
            return Math.floor(Math.random() * (max - min + 1)) + min;
        },

        getLocalizedSelectAnImageSVG: function(req) {
            var innerTexts = req.i18n.__('select_an_image_svg_text').split('\\n');
            return selectAnImageSVG.replace('{INNER_TEXT}', (innerTexts.length === 1) ?
                selectAnImageSVGInnerTextOneLine.replace('{LINE_1}', innerTexts[0]) :
                selectAnImageSVGInnerTextTwoLines.replace('{LINE_1}', innerTexts[0]).replace('{LINE_2}', innerTexts[1]));
        },

        checkUrlIsImage: function(url) {
            if (url.lastIndexOf('http', 0) !== 0) {
                url = 'http://' + url;
            }
            return Promise.resolve();
            /* TODO: this check is unreliable with the current version of image-type and file-type
               with some images, so it's better to skip it completely until we can update
               to a newer version of Node.js. Not a very reliable check in any case since
               the URL content could change at any time... */
            // return new Promise(function(resolve, reject) {
            //     request({
            //         url: url,
            //         timeout: 4000,
            //         encoding: null
            //     }, function(err, res, body) {
            //         if (err) {
            //             if (err.code === 'ETIMEDOUT') {
            //                 logger.warn('Couldn\'t check whether the URL "' + url + '" is actually an image due to connection timeout. Will accept it as one.');
            //                 return resolve()
            //             }
            //             return reject(err);
            //         }
            //         if (imageType(body) !== null || isSvg(body)) {
            //             resolve();
            //         } else {
            //             reject({
            //                 message: 'invalid image file.'
            //             });
            //         }
            //     });
            // });
        },

        transformNewlinesToHtml: function(text) {
            return text.replace(/(?:\r\n|\r|\n)/g, '<br/>');
        },

        langToWebLocaleIso: function(lang) {
            return langToWebLocaleIsoInner(lang);
        },

        getLocales: function() {
            return localesWithIsos;
        },

        getI18nConfig: function() {
            return {
                // setup some locales - other locales default to en silently
                locales: locales,
                defaultLocale: 'en',
                extension: '.json',
                // set the cookie name
                cookieName: 'locale',
                // i18n-2 debug messages can clutter the output. Disable them explicitly even in development mode.
                devMode: false
            };
        },

        getI18n: function(locale) {
            var i18nObject = new i18n(Utils.getI18nConfig());
            if (locale) {
                i18nObject.setLocale(locale);
            }
            return i18nObject;
        },

        getApplicationBaseURL: function() {
            return 'https://' + nconf.get('server').domain;
        },

        getFileMetadata: function(input) {
            var metadata = fileType(Buffer.isBuffer(input) ? input : readChunk.sync(input, 0, fileType.minimumBytes));
            if (isSvg(Buffer.isBuffer(input) ? input : fs.readFileSync(input))) {
                if (metadata === null) {
                    metadata = { ext: 'svg' };
                }
                metadata.mime = 'image/svg+xml';
            }
            return metadata;
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
                if ({}.hasOwnProperty.call(req.files, name) && fs.existsSync(req.files[name].path)) {
                    paths.push(req.files[name].path);
                }
            }
            if (paths.length > 0) {
                paths.map(fs.unlinkSync);
                logger.debug('Successfully deleted the following tmp files: ' + paths.join(' | '));
            }
        },

        dontDeleteTmpFiles: function() {
            return function(req, res, next) {
                res.__deleteFilesOnFinished = false;
                return next();
            }
        },

        transformImage: function(input, width, height, upscale, format, outputFile) {
            var imgFormat = format ? format : null;
            if (sharp) {
                if (imgFormat && imgFormat.lastIndexOf('image/') === 0) {
                    imgFormat = imgFormat.replace('image/', '');
                }
                return transformImageSharp(input, width, height, upscale, imgFormat).then(function(result) {
                    return outputFile ? result.toFile(outputFile) : result.toBuffer();
                });
            } else {
                if (imgFormat && imgFormat.lastIndexOf('image/') === -1) {
                    imgFormat = 'image/' + imgFormat;
                }
                return transformImageJimp(input, width, height, upscale, imgFormat).then(function(result) {
                    return new Promise(function(resolve, reject) {
                        if (outputFile) {
                            result.write(outputFile, function(err) {
                                return err ? reject(err) : resolve();
                            });
                        } else {
                            result.getBuffer(imgFormat || Jimp.AUTO, function(err, buffer) {
                                return err ? reject(err) : resolve(buffer);
                            });
                        }
                    });
                });
            }
        },

        createOrderArray: function(thisFields, model) {
            var scopeArray = [];
            for (field of thisFields) {
                if (model) {
                    scopeArray.push([model, field]);
                } else {
                    scopeArray.push([field]);
                }
            }
            return scopeArray
        }
    };
};
