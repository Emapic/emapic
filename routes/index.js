var fs = require('fs'),
    dbConn = require('nconf').get('db'),
    path = require('path');

conString = process.env.POSTGRESQL_DB_CONN_STRING ||
    ('postgresql://' + dbConn.user + ':'+ dbConn.password + '@' + dbConn.host + ':' + dbConn.port + '/' + dbConn.database);

module.exports = function(app) {

    models  = require('../models');
    require('./utils_api')(app);
    require('./auth')(app);

    require('./main')(app);
    require('./api-engine_routes')(app);

};
