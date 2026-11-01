const { DataTypes: D } = require("sequelize");
module.exports = (s) =>
  s.define(
    "WorkOrder",
    {
      reportId: { type: D.INTEGER, allowNull: false, unique: true },
      dueAt: { type: D.DATE, allowNull: false },
      status: {
        type: D.ENUM(
          "OPEN",
          "ASSIGNED",
          "IN_PROGRESS",
          "COMPLETED",
          "CANCELLED",
        ),
        allowNull: false,
        defaultValue: "OPEN",
      },
      resolutionNote: D.TEXT,
      completedAt: D.DATE,
    },
    { tableName: "work_orders" },
  );
