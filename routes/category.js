const { Router } = require("express");
const { login, admin } = require("../middleware/auth");
const { wrap, text, bool, get, list, fail } = require("./helpers");
module.exports = (db) => {
  const r = Router();
  r.use(login);
  r.get(
    "/",
    wrap(async (req, res) => {
      const where = {};
      if (req.query.active !== undefined) {
        if (!["true", "false"].includes(req.query.active))
          fail(400, "active는 true 또는 false입니다.");
        where.active = req.query.active === "true";
      }
      await list(db.Category, req, res, where);
    }),
  );
  r.post(
    "/",
    admin,
    wrap(async (req, res) => {
      const code = text(req.body.code, "분류 코드", 40);
      if (!/^[A-Z][A-Z0-9_]*$/.test(code))
        fail(400, "코드는 영문 대문자·숫자·밑줄로 입력하세요.");
      res
        .status(201)
        .json(
          await db.Category.create({
            code,
            name: text(req.body.name, "이름"),
            description:
              req.body.description === undefined
                ? null
                : text(req.body.description, "설명", 5000),
          }),
        );
    }),
  );
  r.get(
    "/:id/reports",
    wrap(async (req, res) => {
      const c = await get(db.Category, req.params.id);
      const where = { categoryId: c.id };
      if (req.user.role !== "ADMIN") where.userId = req.user.id;
      await list(db.Report, req, res, where);
    }),
  );
  r.patch(
    "/:id/active",
    admin,
    wrap(async (req, res) => {
      const c = await get(db.Category, req.params.id);
      res.json(await c.update({ active: bool(req.body.active) }));
    }),
  );
  r.get(
    "/:id",
    wrap(async (req, res) => res.json(await get(db.Category, req.params.id))),
  );
  r.patch(
    "/:id",
    admin,
    wrap(async (req, res) => {
      const c = await get(db.Category, req.params.id),
        data = {};
      if (req.body.name !== undefined) data.name = text(req.body.name, "이름");
      if (req.body.description !== undefined)
        data.description = text(req.body.description, "설명", 5000);
      if (!Object.keys(data).length) fail(400, "수정할 필드가 없습니다.");
      res.json(await c.update(data));
    }),
  );
  r.delete(
    "/:id",
    admin,
    wrap(async (req, res) => {
      const c = await get(db.Category, req.params.id);
      if (await db.Report.count({ where: { categoryId: c.id } }))
        fail(409, "사용 중인 분류는 비활성화하세요.");
      await c.destroy();
      res.status(204).end();
    }),
  );
  return r;
};
