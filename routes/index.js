var fs = require('fs'),
    dbConn = require('nconf').get('db'),
    path = require('path');

conString = process.env.POSTGRESQL_DB_CONN_STRING ||
    ('postgresql://' + dbConn.user + ':'+ dbConn.password + '@' + dbConn.host + ':' + dbConn.port + '/' + dbConn.database);

models  = require('../models');

var utilsApi = require('./utils_api'),
    fileHelper = require('../utils/file_helper'),
    auth = require('./auth'),
    main = require('./main'),
    apiEngineRoutes = require('./api-engine_routes');

module.exports = function(app) {

    fileHelper(app);
    utilsApi(app);
    auth(app);
    main(app);
    apiEngineRoutes(app);

};
