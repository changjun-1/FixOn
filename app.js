require("dotenv").config({ quiet: true });
const path = require("path");
const express = require("express");
const session = require("express-session");
const nunjucks = require("nunjucks");
const { csrf } = require("./middleware/auth");
function createApp(db) {
  if (!process.env.SECRET || process.env.SECRET.length < 32)
    throw new Error("SECRET을 32자 이상으로 설정하세요.");
  const app = express();
  const deployed = process.env.VERCEL === "1" || process.env.NODE_ENV === "production";
  if (deployed) app.set("trust proxy", 1);
  app.disable("x-powered-by");
  nunjucks.configure(path.join(__dirname, "views"), {
    autoescape: true,
    express: app,
    watch: !deployed && process.env.NODE_ENV !== "test",
  });
  app.set("view engine", "html");
  if (process.env.NODE_ENV !== "test") app.use(require("morgan")("dev"));
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' https: http:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
    );
    next();
  });
  app.use(express.static(path.join(__dirname, "public")));
  app.use(
    express.json({ limit: "64kb" }),
    express.urlencoded({ extended: false, limit: "64kb" }),
    require("cookie-parser")(),
  );
  const persistent = deployed || process.env.SESSION_STORE === "mysql";
  const store = persistent
    ? new (require("./middleware/sessionStore").MySQLSessionStore)(db.Session)
    : new session.MemoryStore();
  app.locals.sessionStore = store;
  app.use(
    session({
      name: "fixon.sid",
      secret: process.env.SECRET,
      store,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: deployed,
        maxAge: 1000 * 60 * 60 * 4,
      },
    }),
  );
  app.use((req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  });
  app.use(csrf);
  app.use((req, res, next) => {
    Promise.resolve(
      req.session.userId
        ? db.User.findByPk(req.session.userId, {
            attributes: ["id", "name", "role"],
          })
        : null,
    )
      .then((user) => {
        req.user = user ? user.toJSON() : null;
        res.locals.user = req.user;
        next();
      })
      .catch(next);
  });
  for (const [url, file] of [
    ["users", "user"],
    ["reports", "report"],
    ["facilities", "facility"],
    ["categories", "category"],
    ["work-orders", "workOrder"],
  ])
    app.use("/api/" + url, require("./routes/" + file)(db));
  app.use("/api", (req, res) =>
    res.status(404).json({ error: "API를 찾을 수 없습니다." }),
  );
  app.use("/", require("./routes/index")());
  app.use((req, res) =>
    res
      .status(404)
      .render("error.html", {
        title: "페이지 없음",
        message: "페이지를 찾을 수 없습니다.",
      }),
  );
  app.use((err, req, res, next) => {
    if (res.headersSent) return next(err);
    const status =
      err.status ||
      (err.name === "SequelizeUniqueConstraintError" ||
      err.name === "SequelizeForeignKeyConstraintError"
        ? 409
        : err.name === "SequelizeValidationError"
          ? 400
          : 500);
    const message =
      status === 500
        ? "서버 처리 중 오류가 발생했습니다."
        : status === 409 && !err.status
          ? "중복 데이터 또는 연결된 기록이 있습니다."
          : err.message;
    if (status === 500 && process.env.NODE_ENV !== "test") console.error(err);
    if (req.path.startsWith("/api/"))
      return res.status(status).json({ error: message });
    res.status(status).render("error.html", { title: "오류", message });
  });
  return app;
}
const deploymentApp = express();
let initialized;
deploymentApp.get("/healthz", (req, res) => res.json({ status: "ok" }));
deploymentApp.use((req, res, next) => {
  if (!initialized) {
    initialized = (async () => {
      const db = require("./models").createDatabase("production");
      try { await db.sequelize.authenticate(); return createApp(db); }
      catch (error) { await db.sequelize.close(); throw error; }
    })().catch(error => { initialized = undefined; throw error; });
  }
  initialized.then(handler => handler(req, res, next)).catch(error => {
    console.error("Database initialization failed:", error.name);
    res.status(503).json({ error: "온라인 DB 연결과 초기 테이블 설정을 확인하세요." });
  });
});
module.exports = deploymentApp;
module.exports.createApp = createApp;
