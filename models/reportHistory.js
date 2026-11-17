const { Model, DataTypes: D } = require("sequelize");

module.exports = class ReportHistory extends Model {
    static init(sequelize) {
        return super.init({
            actorId: { type: D.STRING(100), allowNull: false },
            actorName: { type: D.STRING(40), allowNull: false },
            action: { type: D.STRING(40), allowNull: false },
            workOrderId: { type: D.INTEGER, allowNull: true },
            before: { type: D.JSON, allowNull: true },
            after: { type: D.JSON, allowNull: false },
        }, {
            sequelize,
            modelName: "ReportHistory",
            tableName: "report_histories",
            updatedAt: false,
            indexes: [{ fields: ["reportId", "id"] }],
        });
    }

    static associate(db) {
        this.belongsTo(db.Report, { foreignKey: "reportId" });
    }
};
