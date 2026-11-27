const { Model, DataTypes: D } = require("sequelize");

module.exports = class StockMovement extends Model {
    static init(sequelize) {
        return super.init({
            quantity: { type: D.INTEGER, allowNull: false },
            type: { type: D.ENUM("IN", "OUT"), allowNull: false },
        }, { sequelize, modelName: "StockMovement", tableName: "stock_movements" });
    }

    static associate(db) {
        this.belongsTo(db.Part, { as: "part", foreignKey: { name: "partId", allowNull: false }, onDelete: "RESTRICT" });
        this.belongsTo(db.WorkPartUsage, { as: "usage", foreignKey: { name: "usageId", allowNull: true }, onDelete: "RESTRICT" });
        this.belongsTo(db.User, { as: "actor", foreignKey: { name: "actorId", allowNull: false }, onDelete: "RESTRICT" });
    }
};
