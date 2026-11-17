const path = require("path");
const defaults = require("./config.json");
require("dotenv").config({ quiet: true });
const base = {
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 3306),
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    dialect: "mysql",
    dialectModule: require("mysql2"),
    logging: false,
    timezone: "+00:00",
    pool: { max: 3, min: 0, idle: 10000, acquire: 15000 },
    dialectOptions:
        process.env.DB_SSL === "true"
            ? {
                  ssl: {
                      rejectUnauthorized: true,
                      ...(process.env.DB_SSL_CA
                          ? { ca: process.env.DB_SSL_CA.replace(/\\n/g, "\n") }
                          : {}),
                  },
              }
            : {},
    define: { charset: "utf8mb4", collate: "utf8mb4_unicode_ci" },
};

module.exports = {
    development: { ...defaults.development, ...base, database: process.env.DB_NAME || defaults.development.database },
    production: { ...defaults.production, ...base, database: process.env.DB_NAME || defaults.production.database },
    test: { ...defaults.test, ...base, database: process.env.TEST_DB_NAME || defaults.test.database },
};
