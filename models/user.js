var Promise = require('bluebird'),
    Map = require("collections/map"),
    randomstring = require('randomstring'),
    logger = require('../utils/logger');

module.exports = function(sequelize, DataTypes) {
    var User = sequelize.define('User', {
        id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
        email: { type: DataTypes.STRING, unique: true, allowNull: false },
        login: { type: DataTypes.STRING, allowNull: false },
        google_id: { type: DataTypes.STRING, unique: true },
        google_token: { type: DataTypes.STRING },
        facebook_id: { type: DataTypes.STRING, unique: true },
        facebook_token: { type: DataTypes.STRING },
        name: { type:  DataTypes.STRING },
        password: { type: DataTypes.STRING },
        api_id: { type: DataTypes.STRING, allowNull: false, unique: true },
        api_secret: { type: DataTypes.STRING, allowNull: false },
        join_date: { type: DataTypes.DATE },
        url: { type: DataTypes.STRING },
        salt: { type: DataTypes.STRING },
        avatar: { type: DataTypes.BLOB },
        activated: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false},
        geom: { type: DataTypes.GEOMETRY('POINT', 4326) },
        display_name: {
            type: DataTypes.VIRTUAL,
            get: function() {
                return (this.name !== null && this.name.trim().length > 0) ? this.name : this.login;
            }
        },
    }, {
        scopes: {
            findByLogin: function(userLogin) {
                return {
                    where: {
                        login: userLogin
                    }
                };
            }
        },
        classMethods: {
            associate: function(models) {
                models.Role.belongsToMany(User, { through: 'rel_users_roles', foreignKey: 'role_id' });
                User.belongsToMany(models.Role, { through: 'rel_users_roles', foreignKey: 'user_id' });
            }
        },
        instanceMethods: {
            getAnsweredSurveys: function() {
                var userId = this.id;
                return Promise.reduce(this.getVotes({
                        include: [
                            {
                                model: models.Survey,
                                include: [{model: models.User, as: 'owner'}]
                            }
                        ],
                        order: ['survey_id', ['vote_date', 'DESC']]
                    }),
                    function(surveys, vote) {
                        if (surveys.has(vote.Survey.id)) {
                            var dates = surveys.get(vote.Survey.id).dates;
                            dates.push(vote.vote_date);
                            surveys.set(vote.Survey.id, {
                                'survey': vote.Survey,
                                'dates' : dates
                            });
                        } else {
                            surveys.set(vote.Survey.id, {
                                'survey': vote.Survey,
                                'dates' : [vote.vote_date]
                            });
                        }
                        return surveys;
                    },
                new Map({})).then(function(surveys) {
                    var surveysArray = surveys.toArray(),
                        answered = [];
                    for (var i = 0, iLen = surveysArray.length; i<iLen; i++) {
                        if (surveysArray[i].dates.length > 0) {
                            var pos = answered.length;
                            for (var j = 0, jLen = answered.length; j<jLen; j++) {
                                if (answered[j].dates[0] < surveysArray[i].dates[0]) {
                                    pos = j;
                                    break;
                                }
                            }
                            answered.splice(pos, 0, {
                                'survey': surveysArray[i].survey,
                                'dates' : surveysArray[i].dates
                            });
                        }
                    }
                    return answered;
                });
            },

            isAdmin: function() {
                return this.isRole('admin');
            },

            isRole: function(role) {
                return this.getRoles({
                    where: {
                        name: role
                    }
                }).then(function(roles) {
                    return roles.length > 0;
                });
            },

            getAnsweredSurveysAndCount: function(options) {
                return this.getAnsweredSurveys().then(function(rows) {
                    var total = rows.length;
                    var offset = (options && options.offset && !isNaN(options.offset)) ? parseInt(options.offset) : 0;
                    var limit = (options && options.limit && !isNaN(options.limit)) ? offset + parseInt(options.limit) : total;
                    return {
                        count: total,
                        rows: rows.slice(offset, limit)
                    };
                });
            },

            resetApiIdSecret: function() {
                this.api_id = randomstring.generate(32);
                this.api_secret = randomstring.generate(64);
                return this.save().catch(function(err) {
                    if (err && err.name == 'SequelizeUniqueConstraintError' &&
                        ((err.errors && err.errors.constructor === Array && err.errors[0].path == 'api_id') ||
                        (err.message.indexOf('users_api_id_key') > -1))) {
                        logger.debug('App ID already in use: ' + err);
                        return this.resetApiIdSecret();
                    }
                    throw err;
                });
            }
        },
        hooks: {
            beforeDestroy: function(user) {
                return user.getSurveys().each(function(survey) {
                    return survey.destroy();
                });
            }
        },
        tableName: 'users'
    });

    return User;
};
