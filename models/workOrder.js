const { Model, DataTypes: D } = require("sequelize");

module.exports = class WorkOrder extends Model {
    static init(sequelize) {
        return super.init(
            {
                reportId: { type: D.INTEGER, allowNull: false, unique: true },
                dueAt: { type: D.DATE, allowNull: false },
                status: {
                    type: D.ENUM("OPEN", "ASSIGNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"),
                    allowNull: false,
                    defaultValue: "OPEN",
                },
                resolutionNote: D.TEXT,
                completedAt: D.DATE,
            },
            { sequelize, modelName: "WorkOrder", tableName: "work_orders" },
        );
    }

    static associate(db) {
        this.belongsTo(db.Report, { foreignKey: "reportId" });
        this.belongsTo(db.User, { foreignKey: "assigneeId", as: "assignee" });
    }
};
