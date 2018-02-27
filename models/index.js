var Sequelize = require('sequelize'),
    fs = require("fs"),
    path = require("path"),
    sequelize = new Sequelize(conString, {
        define: {
            timestamps: false,
            classMethods: {
                getFieldsToHideInDescription: function() {
                    return [];
                }
            },
            instanceMethods: {
                getDescription: function() {
                    return this.getCustomFieldsDescription(
                        extractProperties(this, this.Model.getFieldsToHideInDescription()));
                },

                getCustomFieldsDescription: function(fields) {
                    return fields;
                }
            }
        }
    }),
    db = {};

fs.readdirSync(__dirname)
  .filter(function(file) {
    return (file.indexOf(".") !== 0) && (file !== "index.js");
  })
  .forEach(function(file) {
    var model = sequelize.import(path.join(__dirname, file));
    db[model.name] = model;
  });

Object.keys(db).forEach(function(modelName) {
  if ("associate" in db[modelName]) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
