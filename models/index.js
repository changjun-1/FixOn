const { Sequelize } = require("sequelize");

function createDatabase(env = process.env.NODE_ENV || "development", isolated = true) {
    const config = require("../config/config")[env];
    if (!config) throw new Error("지원하지 않는 NODE_ENV");
    if (!config.username) throw new Error(".env에 DB_USER를 설정하세요.");
    const sequelize = new Sequelize(config.database, config.username, config.password, config);
    const db = { sequelize };
    for (const [name, file] of Object.entries({
        User: "user",
        Facility: "facility",
        Category: "category",
        Report: "report",
        WorkOrder: "workOrder",
        Session: "session",
        ReportHistory: "reportHistory",
    })) {
        const BaseModel = require("./" + file);
        // Separate model classes keep independent test connections isolated.
        db[name] = isolated ? class extends BaseModel {} : BaseModel;
        db[name].init(sequelize);
    }
    for (const Model of Object.values(db))
        if (typeof Model.associate === "function") Model.associate(db);
    return db;
}

module.exports = createDatabase(process.env.NODE_ENV || "development", false);
module.exports.createDatabase = createDatabase;
