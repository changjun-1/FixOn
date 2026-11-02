const { DataTypes: D } = require("sequelize");
module.exports = s => s.define("Session", {
  sid: { type: D.STRING(128), primaryKey: true },
  data: { type: D.TEXT("medium"), allowNull: false },
  expires: { type: D.DATE, allowNull: false },
}, { tableName: "sessions", timestamps: false, indexes: [{ fields: ["expires"] }] });
