var Promise = require('bluebird'),
    nconf = require('nconf'),
    logger = require('../utils/logger'),
    defaultPageSize = nconf.get('app').defaultPageSize;

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
        join_date: { type: DataTypes.DATE },
        url: { type: DataTypes.STRING },
        salt: { type: DataTypes.STRING },
        avatar: { type: DataTypes.BLOB },
        activated: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false},
        accept_info_email: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false},
        geom: { type: DataTypes.GEOMETRY('POINT', 4326) },
        display_name: {
            type: DataTypes.VIRTUAL,
            get: function() {
                return (this.name !== null && this.name.trim().length > 0) ? this.name : this.login;
            }
        }
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
        hooks: {
            beforeDestroy: function(user) {
                return user.getSurveys().each(function(survey) {
                    return survey.destroy();
                });
            }
        },
        tableName: 'users'
    });

    // Class methods
    User.associate = function(models) {
        models.Role.belongsToMany(User, { through: 'rel_users_roles', foreignKey: 'role_id' });
        User.belongsToMany(models.Role, { through: 'rel_users_roles', foreignKey: 'user_id' });
    };

    User.findByLogin = function(login) {
        return User.scope({method: ['findByLogin', login]}).findOne().then(function(usr) {
            if (usr === null) {
                throw new Error('NULL_USER');
            }
            return usr;
        });
    };

    User.getFieldsToHideInDescription = function() {
        return ['already_opened', 'display_name', 'email', 'google_id',
            'google_token', 'facebook_id', 'facebook_token', 'password', 'join_date',
            'url', 'salt', 'avatar', 'activated', 'geom'];
    };

    // Instance methods
    User.prototype.getAnsweredSurveysWithAllDates = function() {
        var userId = this.id;
        return Promise.reduce(this.getVotes({
                include: [
                    {
                        model: models.Survey,
                        include: [{model: User, as: 'owner'}]
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
        new Map([])).then(function(surveys) {
            var surveysArray = Array.from(surveys.values()),
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
    };

    User.prototype.getAnsweredSurveys = function(query, order, pageSize, pageNr) {
        var userId = this.id,
            orders;
        if (order === 'answer') {
            orders = [[sequelize.fn('max', sequelize.col('vote_date')), 'DESC'], [models.Survey, 'id', 'DESC']];
        } else {
            orders = models.Survey.getOrder(order);
            // Must set the proper model for each ordering parameter
            for (var i = 0, iLen = orders.length; i<iLen; i++) {
                orders[i].unshift(models.Survey);
            }
        }
        var params = {
                attributes: [[sequelize.fn('max', sequelize.col('vote_date')), 'vote_date']],
                include: [{
                    model: models.Survey.scope(models.Survey.getScopes(null, null, null, query, null, null))
                }],
                where: {user_id: userId},
                group: ['Survey.id', 'Survey->owner.id'],
                order: orders
            },
            pageSize = (pageSize === null || isNaN(pageSize)) ? defaultPageSize : pageSize;
        if (pageSize !== null) {
            params.limit = pageSize;
            if (pageNr !== null && !isNaN(pageNr)) {
                params.offset = (pageNr - 1) * pageSize;
            }
        }
        return models.Vote.findAndCountAll(params).then(function(results) {
            // Workaround for a sequelize bug that causes counting for each
            // grouped element instead of the total
            if (isNaN(parseInt(results.count))) {
                results.count = results.count.length;
            }
            return results;
        });
    };

    User.prototype.isAdmin = function() {
        return this.isRole('admin');
    };

    User.prototype.isRole = function(role) {
        return this.getRoles({
            where: {
                name: role
            }
        }).then(function(roles) {
            return roles.length > 0;
        });
    };

    User.prototype.getCustomFieldsDescription = function(fields) {
        fields.avatar_url = Utils.getApplicationBaseURL() + '/avatar/' + this.login;
        return fields;
    };

    return User;
};
