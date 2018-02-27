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
            defaultOrdering: function() {
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
                models.Question.hasMany(Answer.scope('defaultOrdering'), {foreignKey: 'question_id'});
            },

            getFieldsToHideInDescription: function() {
                return ['language', 'img'];
            }
        },
        instanceMethods: {
            clone: function(questionId) {
                var props = extractProperties(this, ['id', 'question_id']);
                props.question_id = questionId;
                return Answer.create(props);
            },

            getCustomFieldsDescription: function(fields) {
                if (typeof this.img !== 'undefined' && this.img !== null) {
                    fields.img_url = getApplicationBaseURL() + '/answer_img/' + this.id;
                }
                return fields;
            },

            getFullDescription: function() {
                return Promise.resolve(this.getDescription());
            }
        },
        tableName: 'answers',
        schema: 'metadata'
    });

    return Answer;
};
