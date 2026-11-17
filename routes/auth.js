const { Router } = require("express");
const { wrap, text } = require("./helpers");
const { login } = require("../middleware/auth");
const { loginSession } = require("../middleware/loginSession");
const { settings, validState } = require("../passport/social");

function loginHandler(passport) {
    return (req, res, next) => {
        try {
            text(req.body.id, "아이디", 100);
            text(req.body.password, "비밀번호", 72);
        } catch (error) { return next(error); }
        passport.authenticate("local", (error, user) => {
            if (error) return next(error);
            if (!user) return res.status(401).json({ error: "아이디 또는 비밀번호를 확인하세요." });
            loginSession(req, user).then(() => res.json({
                id: user.id, name: user.name, role: user.role, csrfToken: req.session.csrf,
            })).catch(next);
        })(req, res, next);
    };
}

const logoutHandler = wrap(async (req, res) => {
    await new Promise((resolve, reject) => req.logout((error) => error ? reject(error) : resolve()));
    await new Promise((resolve, reject) => req.session.destroy((error) => error ? reject(error) : resolve()));
    res.clearCookie("fixon.sid");
    res.json({ message: "로그아웃했습니다." });
});

function createRouter(db, passport) {
    const router = Router();
    router.post("/login", loginHandler(passport));
    router.post("/logout", login, logoutHandler);
    router.get("/:provider", (req, res, next) => {
        const provider = req.params.provider;
        if (!["google", "kakao"].includes(provider)) return res.sendStatus(404);
        if (!settings(provider) || !passport._strategy(provider))
            return res.redirect("/login?social=unavailable");
        passport.authenticate(provider)(req, res, next);
    });
    router.get("/:provider/callback", (req, res, next) => {
        const provider = req.params.provider;
        if (!["google", "kakao"].includes(provider)) return res.sendStatus(404);
        const valid = validState(req.session.oauth, provider, req.query.state);
        if (!valid || req.query.error || typeof req.query.code !== "string" || !req.query.code) {
            delete req.session.oauth;
            return req.session.save((error) => error ? next(error) :
                res.redirect(`/login?social=${!valid ? "invalid" : req.query.error ? "cancelled" : "invalid"}`));
        }
        if (!settings(provider) || !passport._strategy(provider))
            return res.redirect("/login?social=unavailable");
        passport.authenticate(provider, (error, user) => {
            if (error || !user) return res.redirect("/login?social=failed");
            loginSession(req, user).then(() => res.redirect("/"))
                .catch(() => res.redirect("/login?social=failed"));
        })(req, res, next);
    });
    return router;
}

module.exports = createRouter(require("../models"), require("passport"));
module.exports.createRouter = createRouter;
module.exports.loginHandler = loginHandler;
module.exports.logoutHandler = logoutHandler;
