module.exports = function(sequelize, DataTypes) {
    var Answer = sequelize.define('Answer', {
        id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
        answer: { type: DataTypes.STRING, allowNull: false },
        img: { type: DataTypes.BLOB },
        legend: { type: DataTypes.STRING, allowNull: true },
        sortorder: { type: DataTypes.INTEGER, allowNull: false },
        language: { type: DataTypes.STRING, allowNull: false, defaultValue: 'es' }
    }, {
        scopes: {
            ordered: function() {
                return {
                    order: Answer.getDefaultOrder()
                };
            }
        },
        classMethods: {
            getDefaultOrder: function() {
                return ['sortorder'];
            },

            associate: function(models) {
                Answer.belongsTo(models.Question, {foreignKey: 'question_id'});
                models.Question.hasMany(Answer.scope('ordered'), {foreignKey: 'question_id'});
            }
        },
        instanceMethods: {
            clone: function(questionId) {
                var props = extractProperties(this, ['id', 'question_id']);
                props.question_id = questionId;
                return Answer.create(props);
            }
        },
        tableName: 'answers',
        schema: 'metadata'
    });

    return Answer;
};
