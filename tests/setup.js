const request = require("supertest");
const bcrypt = require("bcrypt");
const { createDatabase } = require("../models");
const { createApp } = require("../app");
function suite() {
  const ctx = {};
  let ready = false;
  beforeAll(async () => {
    if (
      process.env.NODE_ENV !== "test" ||
      process.env.TEST_DB_NAME !== "fixon_test" ||
      process.env.DB_NAME === "fixon_test"
    )
      throw new Error(
        "안전 검사 실패: TEST_DB_NAME=fixon_test, DB_NAME은 별도 이름으로 설정하세요.",
      );
    ctx.db = createDatabase("test");
    await ctx.db.sequelize.authenticate();
    ctx.app = createApp(ctx.db);
    ready = true;
  }, 15000);
  beforeEach(async () => {
    if (!ready) return;
    // The database name is checked before destructive test-only synchronization.
    if (ctx.db.sequelize.getDatabaseName() !== "fixon_test")
      throw new Error("테스트 DB가 아닙니다.");
    await ctx.db.sequelize.sync({ force: true });
    const password = await bcrypt.hash("Password123!", 4);
    await ctx.db.User.bulkCreate([
      { id: "admin", name: "관리자", role: "ADMIN", password },
      { id: "student", name: "학생", role: "USER", password },
      { id: "other", name: "다른 학생", role: "USER", password },
    ]);
    ctx.facility = await ctx.db.Facility.create({
      name: "프로젝터",
      building: "본관",
      room: "301",
      facilityType: "AV_EQUIPMENT",
    });
    ctx.category = await ctx.db.Category.create({
      code: "AV",
      name: "영상 장비",
    });
    ctx.report = await ctx.db.Report.create({
      title: "프로젝터 고장",
      description: "전원 불량",
      userId: "student",
      facilityId: ctx.facility.id,
      categoryId: ctx.category.id,
    });
    ctx.admin = await client("admin");
    ctx.student = await client("student");
    ctx.other = await client("other");
    ctx.anonymous = await client();
    async function client(user) {
      const agent = request.agent(ctx.app);
      let token = (await agent.get("/api/users/csrf")).body.csrfToken;
      if (user) {
        const response = await agent
          .post("/api/users/login")
          .set("X-CSRF-Token", token)
          .send({ id: user, password: "Password123!" });
        if (response.status !== 200) throw new Error("테스트 로그인 실패");
        token = response.body.csrfToken;
      }
      return {
        get: (url) => agent.get(url),
        post: (url, data) =>
          agent.post(url).set("X-CSRF-Token", token).send(data),
        patch: (url, data) =>
          agent.patch(url).set("X-CSRF-Token", token).send(data),
        delete: (url) => agent.delete(url).set("X-CSRF-Token", token),
      };
    }
  }, 15000);
  afterEach(async () => {
    if (ctx.app)
      await new Promise((resolve) =>
        ctx.app.locals.sessionStore.clear(resolve),
      );
  });
  afterAll(async () => {
    if (ctx.db) await ctx.db.sequelize.close();
  });
  return ctx;
}
module.exports = suite;
