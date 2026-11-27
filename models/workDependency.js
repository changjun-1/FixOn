const { Model, DataTypes: D } = require("sequelize");

module.exports = class WorkDependency extends Model {
    static init(sequelize) {
        return super.init({

        }, { sequelize, modelName: "WorkDependency", tableName: "work_dependencies", indexes: [{ unique: true, fields: ['workOrderId', 'prerequisiteId'] }] });
    }

    static associate(db) {
        this.belongsTo(db.WorkOrder, { as: "workOrder", foreignKey: { name: "workOrderId", allowNull: false }, onDelete: "RESTRICT" });
        this.belongsTo(db.WorkOrder, { as: "prerequisite", foreignKey: { name: "prerequisiteId", allowNull: false }, onDelete: "RESTRICT" });
    }
};
