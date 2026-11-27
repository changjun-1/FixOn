const { Model, DataTypes: D } = require("sequelize");

module.exports = class WorkOrder extends Model {
    static init(sequelize) {
        return super.init(
            {
                reportId: { type: D.INTEGER, allowNull: false },
                dueAt: { type: D.DATE, allowNull: false },
                status: {
                    type: D.STRING(20),
                    allowNull: false,
                    defaultValue: "OPEN",
                },
                resolutionNote: D.TEXT,
                completedAt: D.DATE,
            },
            { sequelize, modelName: "WorkOrder", tableName: "work_orders", indexes: [{ name: "work_orders_report_lookup", fields: ["reportId"] }] },
        );
    }

    static associate(db) {
        this.hasMany(db.WorkAssignment, { foreignKey: "workOrderId", as: "assignments" });
        this.hasMany(db.WorkDependency, { foreignKey: "workOrderId", as: "dependencies" });
        this.hasMany(db.WorkPartUsage, { foreignKey: "workOrderId", as: "partsUsed" });
        this.hasMany(db.WorkReview, { foreignKey: "workOrderId", as: "reviews" });
        this.belongsTo(db.Report, { foreignKey: "reportId" });
        this.belongsTo(db.User, { foreignKey: "assigneeId", as: "assignee" });
    }
};
