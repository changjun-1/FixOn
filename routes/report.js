const { Router } = require("express");
const { login, admin } = require("../middleware/auth");
const {
  Op,
  wrap,
  text,
  id,
  enumeration,
  get,
  list,
  keyword,
  fail,
} = require("./helpers");
const priorities = ["LOW", "NORMAL", "HIGH", "URGENT"];
const states = ["REPORTED", "CONFIRMED", "IN_PROGRESS", "RESOLVED", "REJECTED"];
module.exports = (db) => {
  const r = Router();
  r.use(login);
  const own = (req, report) => {
    if (req.user.role !== "ADMIN" && req.user.id !== report.userId)
      fail(403, "본인 신고만 접근할 수 있습니다.");
  };
  const include = [{ model: db.Facility }, { model: db.Category }];
  async function inputs(body, partial = false) {
    const data = {};
    for (const [k, max] of Object.entries({ title: 150, description: 10000 }))
      if (!partial || body[k] !== undefined) data[k] = text(body[k], k, max);
    for (const [key, Model] of [
      ["facilityId", db.Facility],
      ["categoryId", db.Category],
    ])
      if (!partial || body[key] !== undefined) {
        const row = await get(Model, body[key]);
        if (!row.active) fail(409, "비활성 시설·분류는 사용할 수 없습니다.");
        data[key] = row.id;
      }
    if (body.imageUrl !== undefined) {
      if (body.imageUrl === null || body.imageUrl === "") data.imageUrl = null;
      else {
        const url = text(body.imageUrl, "이미지 URL", 1000);
        let parsed;
        try {
          parsed = new URL(url);
        } catch {
          fail(400, "올바른 이미지 URL이 필요합니다.");
        }
        if (!["http:", "https:"].includes(parsed.protocol))
          fail(400, "HTTP/HTTPS URL만 허용합니다.");
        data.imageUrl = url;
      }
    }
    return data;
  }
  r.get(
    "/",
    wrap(async (req, res) => {
      const where = {};
      if (req.user.role !== "ADMIN") where.userId = req.user.id;
      if (req.query.keyword)
        where[Op.or] = [
          { title: keyword(req.query.keyword) },
          { description: keyword(req.query.keyword) },
        ];
      for (const k of ["facilityId", "categoryId"])
        if (req.query[k]) where[k] = id(req.query[k]);
      if (req.query.status)
        where.status = enumeration(req.query.status, states, "상태");
      if (req.query.priority)
        where.priority = enumeration(
          req.query.priority,
          priorities,
          "우선순위",
        );
      await list(db.Report, req, res, where, include);
    }),
  );
  r.get(
    "/stats",
    wrap(async (req, res) => {
      const where = req.user.role === "ADMIN" ? {} : { userId: req.user.id };
      const rows = await db.Report.findAll({
        where,
        attributes: ["status", "priority"],
        raw: true,
      });
      const counts = Object.fromEntries(states.map((s) => [s, 0]));
      for (const row of rows) counts[row.status]++;
      res.json({
        total: rows.length,
        ...counts,
        urgent: rows.filter((x) => x.priority === "URGENT").length,
      });
    }),
  );
  r.post(
    "/",
    wrap(async (req, res) => {
      const data = await inputs(req.body);
      data.priority =
        req.body.priority === undefined
          ? "NORMAL"
          : enumeration(req.body.priority, priorities, "우선순위");
      res
        .status(201)
        .json(
          await db.Report.create({
            ...data,
            userId: req.user.id,
            status: "REPORTED",
          }),
        );
    }),
  );
  r.get(
    "/:id",
    wrap(async (req, res) => {
      const row = await get(db.Report, req.params.id, {
        include: [...include, { model: db.WorkOrder }],
      });
      own(req, row);
      res.json(row);
    }),
  );
  r.patch(
    "/:id",
    wrap(async (req, res) => {
      const data = await inputs(req.body, true);
      if (!Object.keys(data).length) fail(400, "수정할 필드가 없습니다.");
      const result = await db.sequelize.transaction(async (transaction) => {
        const row = await get(db.Report, req.params.id, {
          transaction,
          lock: transaction.LOCK.UPDATE,
        });
        own(req, row);
        if (req.user.role !== "ADMIN" && row.status !== "REPORTED")
          fail(409, "접수 상태에서만 수정할 수 있습니다.");
        if (
          data.facilityId &&
          data.facilityId !== row.facilityId &&
          (await db.WorkOrder.count({
            where: { reportId: row.id },
            transaction,
          }))
        )
          fail(409, "정비 작업이 있는 신고의 시설은 변경할 수 없습니다.");
        return row.update(data, { transaction });
      });
      res.json(result);
    }),
  );
  r.delete(
    "/:id",
    wrap(async (req, res) => {
      await db.sequelize.transaction(async (transaction) => {
        const row = await get(db.Report, req.params.id, {
          transaction,
          lock: transaction.LOCK.UPDATE,
        });
        own(req, row);
        if (req.user.role !== "ADMIN" && row.status !== "REPORTED")
          fail(409, "접수 상태에서만 삭제할 수 있습니다.");
        if (
          await db.WorkOrder.count({ where: { reportId: row.id }, transaction })
        )
          fail(409, "정비 작업이 연결된 신고는 삭제할 수 없습니다.");
        await row.destroy({ transaction });
      });
      res.status(204).end();
    }),
  );
  r.patch(
    "/:id/status",
    admin,
    wrap(async (req, res) => {
      const target = enumeration(req.body.status, states, "상태");
      const result = await db.sequelize.transaction(async (transaction) => {
        const row = await get(db.Report, req.params.id, {
          transaction,
          lock: transaction.LOCK.UPDATE,
        });
        if (
          await db.WorkOrder.count({ where: { reportId: row.id }, transaction })
        )
          fail(409, "정비 작업 상태를 통해 변경하세요.");
        const allowed = {
          REPORTED: ["CONFIRMED", "REJECTED"],
          CONFIRMED: ["REJECTED"],
        };
        if (!allowed[row.status]?.includes(target))
          fail(409, "허용되지 않는 상태 변경입니다.");
        return row.update({ status: target }, { transaction });
      });
      res.json(result);
    }),
  );
  r.patch(
    "/:id/priority",
    admin,
    wrap(async (req, res) => {
      const row = await get(db.Report, req.params.id);
      res.json(
        await row.update({
          priority: enumeration(req.body.priority, priorities, "우선순위"),
        }),
      );
    }),
  );
  return r;
};
