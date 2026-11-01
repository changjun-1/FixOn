const { DataTypes: D } = require("sequelize");
module.exports = (s) =>
  s.define(
    "Category",
    {
      code: { type: D.STRING(40), allowNull: false, unique: true },
      name: { type: D.STRING(100), allowNull: false },
      description: D.TEXT,
      active: { type: D.BOOLEAN, allowNull: false, defaultValue: true },
    },
    { tableName: "categories" },
  );
