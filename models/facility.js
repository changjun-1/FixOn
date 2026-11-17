const { Model, DataTypes: D } = require("sequelize");

module.exports = class Facility extends Model {
    static init(sequelize) {
        return super.init(
            {
                name: { type: D.STRING(100), allowNull: false },
                building: { type: D.STRING(100), allowNull: false },
                room: { type: D.STRING(100), allowNull: false },
                facilityType: { type: D.STRING(40), allowNull: false },
                description: D.TEXT,
                active: { type: D.BOOLEAN, allowNull: false, defaultValue: true },
            },
            { sequelize, modelName: "Facility", tableName: "facilities" },
        );
    }

    static associate(db) {
        this.hasMany(db.Report, { foreignKey: { name: "facilityId", allowNull: false }, onDelete: "RESTRICT" });
    }
};
