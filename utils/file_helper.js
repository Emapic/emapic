var Promise = require('bluebird'),
    fs = Promise.promisifyAll(require('fs')),
    path = require('path'),
    mkdirp = require('mkdirp'),
    rimraf = Promise.promisify(require('rimraf')),
    logger = require('./logger'),
    uploadedFilesFolder = require('nconf').get('server').uploadedFilesFolder,
    sequelize = models.sequelize;

if (uploadedFilesFolder.charAt(uploadedFilesFolder.length - 1) !== path.sep) {
    uploadedFilesFolder += path.sep;
}

function deleteFile(filePath) {
    return fs.unlinkAsync(filePath).then(function() {
        return sequelize.query('DELETE FROM metadata.files WHERE path = ? RETURNING id;', {
            type: sequelize.QueryTypes.DELETE,
            replacements: [filePath]
        }).then(function(rows) {
            if (rows.length === 0) {
                return null;
            }
            return rows[0].id;
        });
    })
}

module.exports = function(app) {
    FileHelper = {

        saveFileFromBuffer: function(buffer, dstPath, fileName, defaultMime) {
            var cleanDstPath = dstPath;
            while(cleanDstPath.charAt(0) === path.sep) {
                cleanDstPath = cleanDstPath.substr(1);
            }
            var fullDstPath = uploadedFilesFolder + cleanDstPath;

            return new Promise(function(resolve, reject) {
                fs.stat(fullDstPath, function (err) {
                    if (!err) {
                        return reject(new Error('Requested file to create already exists: ' + fullDstPath));
                    } else if (err.code === 'ENOENT')  {
                        return resolve();
                    }
                    return reject(err);
                });
            }).then(function() {
                return new Promise(function(resolve, reject) {
                    mkdirp(path.dirname(fullDstPath), function (err) {
                        if (err)  {
                            return reject(err)
                        }
                        resolve();
                    });
                })
            }).then(function() {
                return new Promise(function(resolve, reject) {
                    var wstream = fs.createWriteStream(fullDstPath);
                    wstream.on('finish', function() {
                        resolve();
                    });
                    wstream.on('error', function(err) {
                        reject(err);
                    });
                    wstream.write(buffer);
                    wstream.end();
                });
            }).then(function() {
                return sequelize.query('INSERT INTO metadata.files(path, original_filename, mime_type) VALUES (?, ?, ?) RETURNING id;', {
                    type: sequelize.QueryTypes.INSERT,
                    replacements: [fullDstPath, fileName, Utils.getFileMimeType(buffer, defaultMime)]
                });
            }).then(function(rows) {
                return rows[0].id;
            }).tap(function(id) {
                logger.debug('Created new file from buffer to path "' + fullDstPath + '" with id ' + id);
            }).catch(function(err) {
                logger.error('Error while saving new file from buffer to path "' + fullDstPath + '" : ' + err.message);
                throw err;
            });
        },

        saveFileFromPath: function(srcPath, dstPath, fileName, defaultMime) {
            var cleanDstPath = dstPath;
            while(cleanDstPath.charAt(0) === path.sep) {
                cleanDstPath = cleanDstPath.substr(1);
            }
            var fullDstPath = uploadedFilesFolder + cleanDstPath;

            return Promise.join(new Promise(function(resolve, reject) {
                fs.stat(fullDstPath, function (err) {
                    if (!err) {
                        return reject(new Error('Requested file to create already exists: ' + fullDstPath));
                    } else if (err.code === 'ENOENT')  {
                        return resolve();
                    }
                    return reject(err);
                });
            }), fs.statAsync(srcPath), function() {
                return new Promise(function(resolve, reject) {
                    mkdirp(path.dirname(fullDstPath), function (err) {
                        if (err)  {
                            return reject(err)
                        }
                        resolve();
                    });
                })
            }).then(function() {
                return new Promise(function(resolve, reject){
                    var rstream = fs.createReadStream(srcPath),
                        wstream = fs.createWriteStream(fullDstPath);
                    wstream.on('finish', function() {
                        resolve();
                    });
                    rstream.on('error', function(err) {
                        reject(err);
                    });
                    wstream.on('error', function(err) {
                        reject(err);
                    });
                    rstream.pipe(wstream);
                });
            }).then(function() {
                return sequelize.query('INSERT INTO metadata.files(path, original_filename, mime_type) VALUES (?, ?, ?) RETURNING id;', {
                    type: sequelize.QueryTypes.INSERT,
                    replacements: [fullDstPath, fileName, Utils.getFileMimeType(srcPath, defaultMime)]
                });
            }).then(function(rows) {
                return rows[0].id;
            }).tap(function(id) {
                logger.debug('Created new file from path "' + srcPath + '" to path "' + fullDstPath + '" with id ' + id);
            }).catch(function(err) {
                logger.error('Error while saving new file from path "' + srcPath + '" to path "' + fullDstPath + '" : ' + err.message);
                throw err;
            });
        },

        deleteFileFromPath: function(filePath) {
            return deleteFile(filePath).tap(function(id) {
                logger.debug('Deleted file with path "' + filePath + '" and id ' + id);
            }).catch(function(err) {
                logger.error('Error while deleting file with path "' + filePath + '": ' + err.message);
                throw err;
            });
        },

        deleteFileFromId: function(fileId) {
            var filePath;
            return sequelize.query('SELECT path FROM metadata.files WHERE id = ?;', {
                type: sequelize.QueryTypes.DELETE,
                replacements: [fileId]
            }).then(function(data) {
                if (data.length === 0 || !data[0].path) {
                    throw new Error('Requested file id doesn\'t exist: ' + fileId);
                }
                filePath = data[0].path;
                return deleteFile(filePath);
            }).tap(function(id) {
                logger.debug('Deleted file with path "' + filePath + '" and id ' + id);
            }).catch(function(err) {
                logger.error('Error while deleting file with id "' + fileId + '": ' + err.message);
                throw err;
            });
        },

        deleteAllFilesFromFolder: function(folderPath) {
            var cleanFolderPath = folderPath;
            while(cleanFolderPath.charAt(0) === path.sep) {
                cleanFolderPath = cleanFolderPath.substr(1);
            }
            if (cleanFolderPath.charAt(cleanFolderPath.length - 1) !== path.sep) {
                cleanFolderPath += path.sep;
            }
            var fullFolderPath = uploadedFilesFolder + cleanFolderPath;
            return rimraf(fullFolderPath).then(function() {
                return sequelize.query("DELETE FROM metadata.files WHERE path LIKE ? || '%';", {
                    type: sequelize.QueryTypes.DELETE,
                    replacements: [fullFolderPath]
                });
            }).tap(function(id) {
                logger.debug('Deleted folder "' + fullFolderPath + '" and all of its files.');
            }).catch(function(err) {
                logger.error('Error while deleting folder "' + fullFolderPath + '": ' + err.message);
                throw err;
            });
        }
    }
};
