const c = require("./setup")();
const { MySQLSessionStore } = require("../middleware/sessionStore");
function call(store, method, ...args) { return new Promise((resolve, reject) => store[method](...args, (error, value) => error ? reject(error) : resolve(value))); }
test("다른 서버 인스턴스에서도 MySQL 세션을 읽고 로그아웃할 수 있다", async () => {
  const a = new MySQLSessionStore(c.db.Session), b = new MySQLSessionStore(c.db.Session);
  await call(a, "set", "session-test", { userId: "admin", cookie: { expires: new Date(Date.now() + 60000) } });
  expect((await call(b, "get", "session-test")).userId).toBe("admin");
  await call(b, "destroy", "session-test");
  expect(await call(a, "get", "session-test")).toBeNull();
});
test("만료 세션 거절 및 유효 세션 만료 연장", async () => {
  const store = new MySQLSessionStore(c.db.Session);
  await call(store, "set", "expired", { cookie: { expires: new Date(Date.now() - 60000) } });
  expect(await call(store, "get", "expired")).toBeNull();
  expect(await c.db.Session.findByPk("expired")).toBeNull();
  await call(store, "set", "live", { userId: "student", cookie: { expires: new Date(Date.now() + 60000) } });
  const later = new Date(Date.now() + 3600000);
  await call(store, "touch", "live", { cookie: { expires: later } });
  expect(new Date((await c.db.Session.findByPk("live")).expires).getTime()).toBeGreaterThan(Date.now() + 3500000);
});
test("배포 모드에서는 HTTPS 쿠키와 SQL 세션을 사용한다", async () => {
  const previous = process.env.VERCEL; process.env.VERCEL = "1";
  let app;
  try { app = require("../app").createApp(c.db); } finally { if (previous === undefined) delete process.env.VERCEL; else process.env.VERCEL = previous; }
  const response = await require("supertest")(app).get("/api/users/csrf").set("X-Forwarded-Proto", "https");
  expect(response.status).toBe(200);
  expect(response.headers["set-cookie"][0]).toContain("Secure");
  expect(app.locals.sessionStore).toBeInstanceOf(MySQLSessionStore);
  expect(await c.db.Session.count()).toBeGreaterThan(0);
});
