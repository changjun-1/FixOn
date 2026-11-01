const { DataTypes: D } = require("sequelize");
module.exports = (s) =>
  s.define(
    "Facility",
    {
      name: { type: D.STRING(100), allowNull: false },
      building: { type: D.STRING(100), allowNull: false },
      room: { type: D.STRING(100), allowNull: false },
      facilityType: { type: D.STRING(40), allowNull: false },
      description: D.TEXT,
      active: { type: D.BOOLEAN, allowNull: false, defaultValue: true },
    },
    { tableName: "facilities" },
  );
