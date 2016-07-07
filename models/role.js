module.exports = function(sequelize, DataTypes) {
    var Role = sequelize.define('Role', {
        id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
        name: { type: DataTypes.STRING, unique: true, allowNull: false }
    }, {
        tableName: 'roles'
    });

    return Role;
};
