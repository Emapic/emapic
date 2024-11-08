module.exports = function(sequelize, DataTypes) {
    var Vote = sequelize.define('Vote', {
        gid: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
        vote_date: DataTypes.DATE
    }, {
        tableName: 'votes',
        schema: 'metadata'
    });

    // Class methods
    Vote.associate = function(models) {
        Vote.belongsTo(models.User, {foreignKey: 'user_id'});
        Vote.belongsTo(models.Survey, {foreignKey: 'survey_id'});
        models.Survey.hasMany(Vote, {foreignKey: 'survey_id'});
        models.User.hasMany(Vote, {foreignKey: 'user_id'});
    };

    return Vote;
};
