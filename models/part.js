const { Model, DataTypes: D } = require("sequelize");

module.exports = class Part extends Model {
    static init(sequelize) {
        return super.init({
            code: { type: D.STRING(40), allowNull: false },
            name: { type: D.STRING(100), allowNull: false },
            stock: { type: D.INTEGER, allowNull: false },
        }, { sequelize, modelName: "Part", tableName: "parts", indexes: [{ unique: true, fields: ['code'] }] });
    }
};
