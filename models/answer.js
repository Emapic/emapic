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
                    order: Utils.createOrderArray(Answer.getDefaultOrder())
                };
            }
        },
        tableName: 'answers',
        schema: 'metadata'
    });

    // Class methods
    Answer.getDefaultOrder = function() {
        return ['sortorder'];
    };

    Answer.associate = function(models) {
        Answer.belongsTo(models.Question, {foreignKey: 'question_id'});
        models.Question.hasMany(Answer.scope('defaultOrdering'), {foreignKey: 'question_id'});
    };

    Answer.getFieldsToHideInDescription = function() {
        return ['language', 'img'];
    };

    // Instance Methods
    Answer.prototype.clone = function(questionId) {
        var props = Utils.extractProperties(this, ['id', 'question_id']);
        props.question_id = questionId;
        return Answer.create(props);
    };

    Answer.prototype.getCustomFieldsDescription = function(fields) {
        if (typeof this.img !== 'undefined' && this.img !== null) {
            fields.img_url = Utils.getApplicationBaseURL() + '/answer_img/' + this.id;
        }
        return fields;
    };

    Answer.prototype.getFullDescription = function() {
        return Promise.resolve(this.getDescription());
    };

    return Answer;
};
