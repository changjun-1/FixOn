const { createDatabase } = require("./models");
const { createApp } = require("./app");
async function start() {
  const db = createDatabase();
  try {
    const app = createApp(db);
    await db.sequelize.authenticate();
    await db.sequelize.sync({ force: false });
    const server = app.listen(
      Number(process.env.PORT || 3000),
      "127.0.0.1",
      () => console.log(`FixOn: http://localhost:${process.env.PORT || 3000}`),
    );
    async function stop() {
      server.close(async () => {
        await db.sequelize.close();
        process.exit(0);
      });
    }
    process.on("SIGINT", stop);
    process.on("SIGTERM", stop);
  } catch (e) {
    console.error("시작 실패:", e.message);
    await db.sequelize.close();
    process.exitCode = 1;
  }
}
start();
