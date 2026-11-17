const { Model, DataTypes: D } = require("sequelize");

module.exports = class Report extends Model {
    static init(sequelize) {
        return super.init(
            {
                title: { type: D.STRING(150), allowNull: false },
                description: { type: D.TEXT, allowNull: false },
                priority: {
                    type: D.ENUM("LOW", "NORMAL", "HIGH", "URGENT"),
                    allowNull: false,
                    defaultValue: "NORMAL",
                },
                status: {
                    type: D.ENUM("REPORTED", "CONFIRMED", "IN_PROGRESS", "RESOLVED", "REJECTED"),
                    allowNull: false,
                    defaultValue: "REPORTED",
                },
                imageUrl: D.STRING(1000),
            },
            { sequelize, modelName: "Report", tableName: "reports" },
        );
    }

    static associate(db) {
        this.belongsTo(db.User, { foreignKey: "userId", as: "author" });
        this.belongsTo(db.Facility, { foreignKey: "facilityId" });
        this.belongsTo(db.Category, { foreignKey: "categoryId" });
        this.hasOne(db.WorkOrder, { foreignKey: { name: "reportId", allowNull: false }, onDelete: "RESTRICT" });
        this.hasMany(db.ReportHistory, { foreignKey: { name: "reportId", allowNull: false }, onDelete: "CASCADE" });
    }
};
