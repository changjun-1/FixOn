const { Sequelize } = require("sequelize");
function createDatabase(env = process.env.NODE_ENV || "development") {
  const config = require("../config/config")[env];
  if (!config) throw new Error("지원하지 않는 NODE_ENV");
  if (!config.username) throw new Error(".env에 DB_USER를 설정하세요.");
  const sequelize = new Sequelize(
    config.database,
    config.username,
    config.password,
    config,
  );
  const db = { sequelize };
  for (const [name, file] of Object.entries({
    User: "user",
    Facility: "facility",
    Category: "category",
    Report: "report",
    WorkOrder: "workOrder",
  }))
    db[name] = require("./" + file)(sequelize);
  const { User, Facility, Category, Report, WorkOrder } = db;
  User.hasMany(Report, {
    foreignKey: { name: "userId", allowNull: false },
    onDelete: "RESTRICT",
  });
  Report.belongsTo(User, { foreignKey: "userId", as: "author" });
  Facility.hasMany(Report, {
    foreignKey: { name: "facilityId", allowNull: false },
    onDelete: "RESTRICT",
  });
  Report.belongsTo(Facility, { foreignKey: "facilityId" });
  Category.hasMany(Report, {
    foreignKey: { name: "categoryId", allowNull: false },
    onDelete: "RESTRICT",
  });
  Report.belongsTo(Category, { foreignKey: "categoryId" });
  Report.hasOne(WorkOrder, {
    foreignKey: { name: "reportId", allowNull: false },
    onDelete: "RESTRICT",
  });
  WorkOrder.belongsTo(Report, { foreignKey: "reportId" });
  User.hasMany(WorkOrder, {
    foreignKey: { name: "assigneeId", allowNull: true },
    onDelete: "RESTRICT",
  });
  WorkOrder.belongsTo(User, { foreignKey: "assigneeId", as: "assignee" });
  return db;
}
module.exports = { createDatabase };
