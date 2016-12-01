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
                    title : req.body.title,
                    external_id:  req.body.id
                }).then(function(locationGroup) {
                    // We create the location_group specific table and triggers
                    return locationGroup.createTable();
                });

            }
        },
        instanceMethods: {
            createTable: function() {
                var locationGroup = this;
                sequelize.query('CREATE TABLE locations.location_group_' + locationGroup.id + '(gid bigserial NOT NULL PRIMARY KEY, geom GEOMETRY(Point, 4326), "precision" integer, address VARCHAR, province_gid integer REFERENCES base_layers.provinces (gid) MATCH SIMPLE ON UPDATE NO ACTION ON DELETE NO ACTION, madrid_barrio_gid integer REFERENCES base_layers.madrid_barrios (gid) MATCH SIMPLE ON UPDATE NO ACTION ON DELETE NO ACTION, "timestamp" timestamp without time zone, usr_id VARCHAR UNIQUE);')
                .spread(function(results, metadata) {
                    // We create the trigger for assigning provinces
                    return sequelize.query('CREATE TRIGGER assign_province_trigger BEFORE INSERT OR UPDATE ON locations.location_group_' + locationGroup.id + ' FOR EACH ROW EXECUTE PROCEDURE assign_province();' +
                        'CREATE TRIGGER assign_madrid_barrio_trigger BEFORE INSERT OR UPDATE ON locations.location_group_' + locationGroup.id + ' FOR EACH ROW EXECUTE PROCEDURE assign_madrid_barrio();');
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
                    var body = req.body,
                        insert_query = 'INSERT INTO locations.location_group_' + locationGroup.id + ' (usr_id, precision, address, timestamp, geom) VALUES (?, ?, ?, ?, ST_SetSRID(ST_MakePoint(?, ?), 4326))',
                        insert_params = [('usr_id' in body && body.usr_id.trim() !== '') ? body.usr_id : null, body.precision, ('address' in body) ? body.address : null, dateUtc, body.lng, body.lat];
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
            },

            getAggregatedTotals: function(layer, params) {
                var locationGroup = this,
                    geom,
                    sql1,
                    sql2;
                params.geom = params.geom || 'simple';
                switch (layer) {
                    case 'countries':
                        sql1 = "SELECT lower(a.iso_code_2) AS iso_code, count(b.gid) AS total_locations";
                        sql2 = " FROM base_layers.countries a JOIN base_layers.provinces c ON a.gid = c.country_gid JOIN locations.location_group_" + locationGroup.id + " b ON c.gid = b.province_gid GROUP BY a.gid ORDER BY total_locations DESC, iso_code ASC;";
                        break;
                    case 'provinces':
                        sql1 = "SELECT gns_adm1 AS country_id, iso_3166_2 AS iso_code, adm1_code as adm_code, type_en AS adm_type, lower(iso_a2) AS country_iso_code, count(b.gid) AS total_locations";
                        sql2 = " FROM base_layers.provinces a JOIN locations.location_group_" + locationGroup.id + " b ON a.gid = b.province_gid GROUP BY a.gid ORDER BY total_locations DESC, a.name ASC;";
                        break;
                    case 'madrid_barrios':
                        if (params.geom == 'simple') {
                            params.geom = 'full';
                        }
                        sql1 = "SELECT name, codbar as cod_barrio, coddistrit as cod_distrito, codbarrio as cod_total, poblacion as population, count(b.gid) AS total_locations";
                        sql2 = " FROM base_layers.madrid_barrios a LEFT JOIN locations.location_group_" + locationGroup.id + " b ON a.gid = b.madrid_barrio_gid GROUP BY a.gid ORDER BY total_locations DESC, a.name ASC;";
                        break;
                    case 'madrid_distritos':
                        if (params.geom == 'simple') {
                            params.geom = 'full';
                        }
                        sql1 = "SELECT a.name, a.coddistrit as cod_distrito, a.poblacion as population, count(c.gid) AS total_locations";
                        sql2 = " FROM base_layers.madrid_distritos a JOIN base_layers.madrid_barrios b ON a.coddistrit = b.coddistrit LEFT JOIN locations.location_group_" + locationGroup.id + " c ON b.gid = c.madrid_barrio_gid GROUP BY a.gid ORDER BY total_locations DESC, a.name ASC;";
                        break;
                    default:
                        return Promise.reject(new Error('INVALID BASE LAYER'));
                }
                if ('geom' in params) {
                    switch (params.geom) {
                        case 'simple':
                            geom = ', st_asgeojson(a.simp_geom) as geojson';
                            break;
                        case 'full':
                            geom = ', st_asgeojson(a.geom) as geojson';
                            break;
                        case 'bbox':
                            geom = ', st_asgeojson(st_envelope(a.geom)) as geojson';
                            break;
                        case 'centroid':
                            geom = ', st_asgeojson(st_centroid(a.geom)) as geojson';
                            break;
                        case 'none':
                            geom = '';
                            break;
                        default:
                            return Promise.reject(new Error('INVALID GEOM TYPE'));
                    }
                }
                if ('lang' in params) {
                    namePromise = checkColumnExists('name_' + params.lang, layer, 'base_layers').then(function(result) {
                        return (result[0].exists) ? 'name_' + params.lang : 'name';
                    });
                } else {
                    namePromise = Promise.resolve('name');
                }
                return namePromise.then(function(nameCol) {
                    var query = sql1 + ', a.' + nameCol + ' AS name';
                    query += geom + sql2;
                    return sequelize.query(query, { type: sequelize.QueryTypes.SELECT });
                });
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
