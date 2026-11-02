const { Op } = require("sequelize");
const { createDatabase } = require("../models");
(async () => {
  const db = createDatabase();
  try { console.log("만료 세션 정리:", await db.Session.destroy({ where: { expires: { [Op.lt]: new Date() } } })); }
  finally { await db.sequelize.close(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
