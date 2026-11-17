const { Model, DataTypes: D } = require("sequelize");

module.exports = class Category extends Model {
    static init(sequelize) {
        return super.init(
            {
                code: { type: D.STRING(40), allowNull: false, unique: true },
                name: { type: D.STRING(100), allowNull: false },
                description: D.TEXT,
                active: { type: D.BOOLEAN, allowNull: false, defaultValue: true },
            },
            { sequelize, modelName: "Category", tableName: "categories" },
        );
    }

    static associate(db) {
        this.hasMany(db.Report, { foreignKey: { name: "categoryId", allowNull: false }, onDelete: "RESTRICT" });
    }
};
