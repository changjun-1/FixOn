const { Model, DataTypes: D } = require("sequelize");

module.exports = class Session extends Model {
    static init(sequelize) {
        return super.init(
            {
                sid: { type: D.STRING(128), primaryKey: true },
                data: { type: D.TEXT, allowNull: false },
                expires: { type: D.DATE, allowNull: false },
            },
            { sequelize, modelName: "Session", tableName: "sessions", timestamps: false, indexes: [{ fields: ["expires"] }] },
        );
    }

    static associate() {}
};
