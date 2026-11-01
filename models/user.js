const { DataTypes: D } = require("sequelize");
module.exports = (s) =>
  s.define(
    "User",
    {
      id: { type: D.STRING(100), primaryKey: true },
      password: { type: D.STRING(100), allowNull: false },
      name: { type: D.STRING(40), allowNull: false },
      role: {
        type: D.ENUM("USER", "ADMIN"),
        allowNull: false,
        defaultValue: "USER",
      },
    },
    { tableName: "users" },
  );
