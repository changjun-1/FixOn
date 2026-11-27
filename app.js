require("dotenv").config({ quiet: true });
const path = require("path");
const express = require("express");
const session = require("express-session");
const nunjucks = require("nunjucks");
const { csrf } = require("./middleware/auth");
const passport = require("passport");
const passportConfig = require("./passport");
const database = require("./models");
const authRouter = require("./routes/auth");
const userRouter = require("./routes/user");
const reportRouter = require("./routes/report");
const facilityRouter = require("./routes/facility");
const categoryRouter = require("./routes/category");
const workOrderRouter = require("./routes/workOrder");
const indexRouter = require("./routes");

function createApp(db = database) {
    if (!process.env.SECRET || process.env.SECRET.length < 32)
        throw new Error("SECRET을 32자 이상으로 설정하세요.");
    const app = express();
    app.set("port", Number(process.env.PORT || 3000));
    const authentication = passportConfig(db, db === database ? passport : new passport.Passport());
    app.locals.passport = authentication;
    const deployed = process.env.NODE_ENV === "production";
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
    app.use(authentication.initialize());
    app.use(authentication.session());
    app.use(csrf);
    app.use((req, res, next) => {
        res.locals.user = req.user;
        next();
    });
    const bind = (router) => db === database ? router : router.createRouter(db, authentication);
    app.use("/auth", bind(authRouter));
    app.use("/api/users", bind(userRouter));
    app.use("/api/reports", bind(reportRouter));
    app.use("/api/facilities", bind(facilityRouter));
    app.use("/api/categories", bind(categoryRouter));
    app.use("/api/work-orders", bind(workOrderRouter));
    app.use("/api", (req, res) => res.status(404).json({ error: "API를 찾을 수 없습니다." }));
    app.use("/", indexRouter);
    app.use((req, res) =>
        res.status(404).render("error.html", {
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
        if (req.path.startsWith("/api/")) return res.status(status).json({ error: message });
        res.status(status).render("error.html", { title: "오류", message });
    });
    return app;
}
const app = createApp(database);
module.exports = app;
module.exports.createApp = createApp;

// Importing the app for tests never starts a server.
if (require.main === module) {
    (async () => {
        try {
            await database.sequelize.authenticate();
            await database.sequelize.sync({ force: false });
            await require("./scripts/migrate-work-orders")(database.sequelize);
            const server = await new Promise((resolve, reject) => {
                const listener = app.listen(app.get("port"), "127.0.0.1", () => resolve(listener));
                listener.once("error", reject);
            });
            console.log(`FixOn: http://localhost:${app.get("port")}`);
            const stop = () => server.close(async () => {
                await database.sequelize.close();
                process.exit(0);
            });
            process.on("SIGINT", stop);
            process.on("SIGTERM", stop);
        } catch (error) {
            console.error("시작 실패:", error.message);
            await database.sequelize.close();
            process.exitCode = 1;
        }
    })();
}
