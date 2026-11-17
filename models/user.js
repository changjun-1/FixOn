const { Model, DataTypes: D } = require("sequelize");

module.exports = class User extends Model {
    static init(sequelize) {
        return super.init(
            {
                id: { type: D.STRING(100), primaryKey: true },
                password: { type: D.STRING(100), allowNull: false },
                name: { type: D.STRING(40), allowNull: false },
                role: {
                    type: D.ENUM("USER", "ADMIN"),
                    allowNull: false,
                    defaultValue: "USER",
                },
            },
            { sequelize, modelName: "User", tableName: "users" },
        );
    }

    static associate(db) {
        this.hasMany(db.Report, { foreignKey: { name: "userId", allowNull: false }, onDelete: "RESTRICT" });
        this.hasMany(db.WorkOrder, { foreignKey: { name: "assigneeId", allowNull: true }, onDelete: "RESTRICT" });
    }
};
