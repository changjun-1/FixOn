require("dotenv").config({ quiet: true });
const base = {
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  dialect: "mysql",
  logging: false,
  timezone: "+00:00",
  define: { charset: "utf8mb4", collate: "utf8mb4_unicode_ci" },
};
module.exports = {
  development: { ...base, database: process.env.DB_NAME || "fixon" },
  test: { ...base, database: process.env.TEST_DB_NAME || "fixon_test" },
};
