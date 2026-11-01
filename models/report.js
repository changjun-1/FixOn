const { DataTypes: D } = require("sequelize");
module.exports = (s) =>
  s.define(
    "Report",
    {
      title: { type: D.STRING(150), allowNull: false },
      description: { type: D.TEXT, allowNull: false },
      priority: {
        type: D.ENUM("LOW", "NORMAL", "HIGH", "URGENT"),
        allowNull: false,
        defaultValue: "NORMAL",
      },
      status: {
        type: D.ENUM(
          "REPORTED",
          "CONFIRMED",
          "IN_PROGRESS",
          "RESOLVED",
          "REJECTED",
        ),
        allowNull: false,
        defaultValue: "REPORTED",
      },
      imageUrl: D.STRING(1000),
    },
    { tableName: "reports" },
  );
