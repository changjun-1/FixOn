const { Model, DataTypes: D } = require("sequelize");

module.exports = class WorkReview extends Model {
    static init(sequelize) {
        return super.init({
            decision: { type: D.ENUM("APPROVED", "REJECTED"), allowNull: false },
            comment: { type: D.TEXT, allowNull: true },
        }, { sequelize, modelName: "WorkReview", tableName: "work_reviews" });
    }

    static associate(db) {
        this.belongsTo(db.WorkOrder, { as: "workOrder", foreignKey: { name: "workOrderId", allowNull: false }, onDelete: "RESTRICT" });
        this.belongsTo(db.User, { as: "reviewer", foreignKey: { name: "reviewerId", allowNull: false }, onDelete: "RESTRICT" });
    }
};
