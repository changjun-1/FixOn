const { Router } = require("express");
const { login, admin } = require("../middleware/auth");
const { wrap, text, bool, get, list, keyword, fail } = require("./helpers");
module.exports = (db) => {
  const r = Router();
  r.use(login);
  const fields = (body, partial = false) => {
    const data = {};
    for (const [k, max] of Object.entries({
      name: 100,
      building: 100,
      room: 100,
      facilityType: 40,
    })) {
      if (!partial || body[k] !== undefined) data[k] = text(body[k], k, max);
    }
    if (body.description !== undefined)
      data.description = text(body.description, "설명", 5000);
    if (body.active !== undefined) data.active = bool(body.active);
    if (!Object.keys(data).length) fail(400, "수정할 필드가 없습니다.");
    return data;
  };
  r.get(
    "/",
    wrap(async (req, res) => {
      const where = {};
      for (const k of ["name", "building", "room"])
        if (req.query[k]) where[k] = keyword(req.query[k]);
      if (req.query.keyword) where.name = keyword(req.query.keyword);
      if (req.query.facilityType) where.facilityType = req.query.facilityType;
      if (req.query.active !== undefined) {
        if (!["true", "false"].includes(req.query.active))
          fail(400, "active는 true 또는 false입니다.");
        where.active = req.query.active === "true";
      }
      await list(db.Facility, req, res, where);
    }),
  );
  r.post(
    "/",
    admin,
    wrap(async (req, res) =>
      res.status(201).json(await db.Facility.create(fields(req.body))),
    ),
  );
  r.get(
    "/:id/reports",
    wrap(async (req, res) => {
      const f = await get(db.Facility, req.params.id);
      const where = { facilityId: f.id };
      if (req.user.role !== "ADMIN") where.userId = req.user.id;
      await list(db.Report, req, res, where);
    }),
  );
  r.get(
    "/:id/maintenance-history",
    wrap(async (req, res) => {
      const f = await get(db.Facility, req.params.id);
      const where = { facilityId: f.id };
      if (req.user.role !== "ADMIN") where.userId = req.user.id;
      await list(db.WorkOrder, req, res, {}, [
        { model: db.Report, where, required: true },
      ]);
    }),
  );
  r.get(
    "/:id",
    wrap(async (req, res) => res.json(await get(db.Facility, req.params.id))),
  );
  r.patch(
    "/:id",
    admin,
    wrap(async (req, res) => {
      const f = await get(db.Facility, req.params.id);
      res.json(await f.update(fields(req.body, true)));
    }),
  );
  r.delete(
    "/:id",
    admin,
    wrap(async (req, res) => {
      const f = await get(db.Facility, req.params.id);
      if (await db.Report.count({ where: { facilityId: f.id } }))
        fail(409, "신고에서 사용 중인 시설은 비활성화하세요.");
      await f.destroy();
      res.status(204).end();
    }),
  );
  return r;
};
