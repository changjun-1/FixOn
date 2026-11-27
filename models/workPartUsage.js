const { Model, DataTypes: D } = require("sequelize");

module.exports = class WorkPartUsage extends Model {
    static init(sequelize) {
        return super.init({
            quantity: { type: D.INTEGER, allowNull: false },
        }, { sequelize, modelName: "WorkPartUsage", tableName: "work_part_usages", indexes: [{ unique: true, fields: ['workOrderId', 'partId'] }] });
    }

    static associate(db) {
        this.belongsTo(db.WorkOrder, { as: "workOrder", foreignKey: { name: "workOrderId", allowNull: false }, onDelete: "RESTRICT" });
        this.belongsTo(db.Part, { as: "part", foreignKey: { name: "partId", allowNull: false }, onDelete: "RESTRICT" });
    }
};
