var Sequelize = require('sequelize'),
    fs = require("fs"),
    path = require("path"),
    sequelize = new Sequelize(conString, {
        define: {
            timestamps: false,
            // logging: console.log
        }
    }),
    globalClassMethods = {
        getFieldsToHideInDescription: function() {
            return [];
        }
    },
    globalInstanceMethods = {
        getDescription: function() {
            return this.getCustomFieldsDescription(
                Utils.extractProperties(this, this.getSequelizeModel().getFieldsToHideInDescription()));
        },

        getCustomFieldsDescription: function(fields) {
            return fields;
        },

        getSequelizeModel: function() {
            // Workaround to get model from instance in latest Sequelize versions
            return this._modelOptions.sequelize.models[this._modelOptions.name.singular];
        }
    },
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
  for (fn in globalInstanceMethods) {
      if (!db[modelName].prototype[fn]) {
          db[modelName].prototype[fn] = globalInstanceMethods[fn];
      }
  }
  for (fn in globalClassMethods) {
      if (!db[modelName][fn]) {
          db[modelName][fn] = globalClassMethods[fn];
      }
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
