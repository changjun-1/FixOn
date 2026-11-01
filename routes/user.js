const routerFactory = require("express").Router;
const bcrypt = require("bcrypt");
const { login, admin } = require("../middleware/auth");
const { wrap, text, fail } = require("./helpers");
module.exports = (db) => {
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
  r.post(
    "/login",
    wrap(async (req, res) => {
      const id = text(req.body.id, "아이디", 100),
        password = text(req.body.password, "비밀번호", 72);
      const user = await db.User.findByPk(id);
      if (!user || !(await bcrypt.compare(password, user.password)))
        fail(401, "아이디 또는 비밀번호를 확인하세요.");
      await new Promise((resolve, reject) =>
        req.session.regenerate((e) => (e ? reject(e) : resolve())),
      );
      req.session.userId = user.id;
      req.session.csrf = require("crypto").randomBytes(32).toString("hex");
      res.json({
        id: user.id,
        name: user.name,
        role: user.role,
        csrfToken: req.session.csrf,
      });
    }),
  );
  r.post(
    "/logout",
    login,
    wrap(async (req, res) => {
      await new Promise((resolve, reject) =>
        req.session.destroy((e) => (e ? reject(e) : resolve())),
      );
      res.clearCookie("fixon.sid");
      res.json({ message: "로그아웃했습니다." });
    }),
  );
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
};
