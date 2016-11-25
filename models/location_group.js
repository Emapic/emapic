var Promise = require('bluebird');

module.exports = function(sequelize, DataTypes) {
    var LocationGroup = sequelize.define('LocationGroup', {
        id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
        title: DataTypes.STRING,
        active: DataTypes.BOOLEAN,
        date_created: {type: DataTypes.DATE, defaultValue: sequelize.fn('now') },
        nr_votes: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        external_id: DataTypes.STRING,
        already_opened: {
            // We need this virtual field because mustache cannot do comparisons
            // and therefore can't differentiate between null and false.
            type: DataTypes.VIRTUAL,
            get: function() {
                return this.active !== null;
            }
        }
    }, {
        scopes: {
            alreadyOpened: {
                where: {
                    active: {
                        $ne: null
                    }
                }
            }
        },
        classMethods: {
            associate: function(models) {
                LocationGroup.addScope('includeAuthor', {
                    include: [{model: models.User, as: 'owner'}]
                });
                LocationGroup.belongsTo(models.User, {as: 'owner', foreignKey: 'owner_id'});
                models.User.hasMany(LocationGroup, {foreignKey: 'owner_id'});
            },

            createFromPost: function(req) {
                var location_group;

                return LocationGroup.create({
                    owner_id:  req.user.id,
                    title : 'xx',
                    external_id:  req.body.external_id
                }).then(function(locationGroup) {
                    // We create the location_group specific table and triggers
                    return locationGroup.createTable();
                });

            }
        },
        instanceMethods: {
            createTable: function() {
                var locationGroup = this;
                sequelize.query('CREATE TABLE locations.location_group_' + locationGroup.id + '(gid bigserial NOT NULL PRIMARY KEY, geom GEOMETRY(Point, 4326), "precision" integer, province_gid integer REFERENCES base_layers.provinces (gid) MATCH SIMPLE ON UPDATE NO ACTION ON DELETE NO ACTION, "timestamp" timestamp without time zone, usr_id VARCHAR UNIQUE);')
                .spread(function(results, metadata) {
                    // We create the trigger for assigning provinces
                    return sequelize.query('CREATE TRIGGER assign_province_trigger BEFORE INSERT OR UPDATE ON locations.location_group_' + locationGroup.id + ' FOR EACH ROW EXECUTE PROCEDURE assign_province();');
                });
            },

            dropTable: function() {
                return sequelize.query('DROP TABLE IF EXISTS locations.location_group_' + this.id + ';');
            },

            clearTable: function() {
                return sequelize.query('DELETE FROM locations.location_group_' + this.id + ';');
            },

            clearVotes: function() {
                return this.clearTable();
            },

            saveResponse: function(req) {
                var survey = this,
                    date = new Date(),
                    dateUtc = date.toISOString().replace(/T/, ' ').replace(/Z/, '');
                return Promise.join(this.getOwner(), this.getQuestions(), function(owner, questions) {
                    var usr_id = (req.user) ? parseInt(req.user.id) : null;
                    // If the survey is closed, or it's a draft and the
                    // vote doesn't come from its owner, we reject the vote
                    if (survey.active === false || (survey.active === null && usr_id != owner.id)) {
                        return Promise.reject();
                    }
                    // If the survey is a draft, then its owner's votes are stored as anonymous
                    usr_id = (survey.active === null && usr_id == owner.id) ? null : usr_id;
                    var body = req.body;
                    // If there is an emapic opinion, we save it
                    // We don't need it for anything, so we don't even handle
                    // its promise.
                    Survey.saveEmapicOpinion(req);
                    // If geolocation was used, we save the distance between
                    // the original position and the selected one.
                    // We don't need it for anything, so we don't even handle
                    // its promise.
                    Survey.saveGeolocationDistance(req);

                    var insert_query1 = 'INSERT INTO opinions.survey_' + survey.id + ' (usr_id, precision, timestamp, geom',
                    insert_query2 = ') VALUES (?, ?, ?, ST_SetSRID(ST_MakePoint(?, ?), 4326)',
                    insert_params = [usr_id, body.precision, dateUtc, body.lng, body.lat];
                    for (var i = 0, iLen = questions.length; i<iLen; i++) {
                        var vars = questions[i].getInsertSql(body.responses);
                        insert_query1 += (vars[0] !== '' ? ', ' : '') + vars[0];
                        insert_query2 += (vars[1] !== '' ? ', ' : '') + vars[1];
                        insert_params = insert_params.concat(vars[2]);
                    }
                    insert_query1 += insert_query2 + ');';

                    return sequelize.query(insert_query1,
                        { replacements: insert_params, type: sequelize.QueryTypes.INSERT }
                    ).then(function() {
                        return models.Vote.create({
                            user_id : usr_id,
                            survey_id : survey.id,
                            vote_date : date
                        });
                    });
                });
            },

            saveLocation: function(req) {
                var locationGroup = this,
                    date = new Date(),
                    dateUtc = date.toISOString().replace(/T/, ' ').replace(/Z/, '');
                return Promise.join(this.getOwner(), function(owner) {
                    // If the locationGroup is closed, or it's a draft and the
                    // vote doesn't come from its owner, we reject the vote
                    if (locationGroup.active === false) {
                        return Promise.reject();
                    }
                    //
                    var body = req.body;

                    var insert_query = 'INSERT INTO locations.location_group_' + locationGroup.id + ' (usr_id, precision, timestamp, geom) VALUES (?, ?, ?, ST_SetSRID(ST_MakePoint(?, ?), 4326))';
                    insert_params = [body.usr_id, body.precision, dateUtc, body.lng, body.lat];

                    return sequelize.query(insert_query,
                        { replacements: insert_params, type: sequelize.QueryTypes.INSERT }
                    );
                });
            },

            getLocations: function() {
                var id = this.id;
                return sequelize.query("SELECT (extract(epoch from timestamp) * 1000)::bigint as timestamp, st_asgeojson(geom) as geojson, usr_id FROM locations.location_group_" + id,
                    { type: sequelize.QueryTypes.SELECT }
                );
            }
        },
        hooks: {
            beforeDestroy: function(survey) {
                return survey.dropTable();
            }
        },
        tableName: 'location_groups',
        schema: 'metadata'
    });

    return LocationGroup;
};
