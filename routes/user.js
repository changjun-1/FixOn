const routerFactory = require("express").Router;
const bcrypt = require("bcrypt");
const { loginHandler, logoutHandler } = require("./auth");
const { login, admin } = require("../middleware/auth");
const { wrap, text, fail } = require("./helpers");

function createRouter(db, passport) {
    const r = routerFactory();
    r.get("/csrf", (req, res) => res.json({ csrfToken: req.session.csrf }));
    r.post(
        "/register",
        wrap(async (req, res) => {
            const id = text(req.body.id, "아이디", 100),
                name = text(req.body.name, "이름", 40),
                password = text(req.body.password, "비밀번호", 72);
            if (
                !/^[A-Za-z0-9_.@-]{3,100}$/.test(id) ||
                password.length < 8 ||
                Buffer.byteLength(password) > 72
            )
                fail(
                    400,
                    "아이디는 영문·숫자 등 3자 이상, 비밀번호는 8자 이상·72바이트 이하입니다.",
                );
            const user = await db.User.create({
                id,
                name,
                password: await bcrypt.hash(password, 12),
                role: "USER",
            });
            res.status(201).json({ id: user.id, name: user.name, role: user.role });
        }),
    );
    // Keep the existing JSON API URLs while sharing the /auth handlers.
    r.post("/login", loginHandler(passport));
    r.post("/logout", login, logoutHandler);
    r.get("/me", login, (req, res) => res.json(req.user));
    r.get(
        "/",
        admin,
        wrap(async (req, res) =>
            res.json({
                data: await db.User.findAll({
                    attributes: ["id", "name", "role"],
                    order: [["name", "ASC"]],
                }),
            }),
        ),
    );
    return r;
}

module.exports = createRouter(require("../models"), require("passport"));
module.exports.createRouter = createRouter;
