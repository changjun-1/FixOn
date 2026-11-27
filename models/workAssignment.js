const { Model, DataTypes: D } = require("sequelize");

module.exports = class WorkAssignment extends Model {
    static init(sequelize) {
        return super.init({
            role: { type: D.ENUM("LEAD", "SUPPORT"), allowNull: false },
        }, { sequelize, modelName: "WorkAssignment", tableName: "work_assignments", indexes: [{ unique: true, fields: ['workOrderId', 'userId'] }] });
    }

    static associate(db) {
        this.belongsTo(db.WorkOrder, { as: "workOrder", foreignKey: { name: "workOrderId", allowNull: false }, onDelete: "RESTRICT" });
        this.belongsTo(db.User, { as: "user", foreignKey: { name: "userId", allowNull: false }, onDelete: "RESTRICT" });
    }
};
