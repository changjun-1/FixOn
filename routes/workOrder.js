const { Router } = require("express");
const { admin } = require("../middleware/auth");
const {
  Op,
  wrap,
  text,
  id,
  date,
  enumeration,
  get,
  list,
  fail,
} = require("./helpers");
const states = ["OPEN", "ASSIGNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"];
module.exports = (db) => {
  const r = Router();
  r.use(admin);
  const include = [
    { model: db.Report, include: [db.Facility] },
    { model: db.User, as: "assignee", attributes: ["id", "name"] },
  ];
  const overdue = () => ({
    dueAt: { [Op.lt]: new Date() },
    status: { [Op.notIn]: ["COMPLETED", "CANCELLED"] },
  });
  // Always lock the parent report first so concurrent report/work changes serialize.
  async function change(value, fn) {
    const snapshot = await get(db.WorkOrder, value);
    return db.sequelize.transaction(async (transaction) => {
      const report = await get(db.Report, snapshot.reportId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      const row = await get(db.WorkOrder, value, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      return fn(row, report, transaction);
    });
  }
  r.get(
    "/",
    wrap(async (req, res) => {
      const where = {};
      if (req.query.status)
        where.status = enumeration(req.query.status, states, "상태");
      if (req.query.assigneeId)
        where.assigneeId = text(req.query.assigneeId, "담당자", 100);
      if (req.query.keyword) {
        const matching = await db.Report.findAll({
          where: {
            title: { [Op.like]: "%" + text(req.query.keyword, "검색어") + "%" },
          },
          attributes: ["id"],
        });
        where.reportId = { [Op.in]: matching.map((x) => x.id) };
      }
      await list(db.WorkOrder, req, res, where, include);
    }),
  );
  r.get(
    "/overdue",
    wrap(async (req, res) => list(db.WorkOrder, req, res, overdue(), include)),
  );
  r.get(
    "/summary",
    wrap(async (req, res) => {
      const rows = await db.WorkOrder.findAll({
        attributes: ["status", "dueAt"],
        raw: true,
      });
      const counts = Object.fromEntries(states.map((s) => [s, 0]));
      for (const row of rows) counts[row.status]++;
      res.json({
        total: rows.length,
        ...counts,
        overdue: rows.filter(
          (x) =>
            !["COMPLETED", "CANCELLED"].includes(x.status) &&
            new Date(x.dueAt) < new Date(),
        ).length,
      });
    }),
  );
  r.post(
    "/",
    wrap(async (req, res) => {
      const reportId = id(req.body.reportId),
        dueAt = date(req.body.dueAt);
      const row = await db.sequelize.transaction(async (transaction) => {
        const report = await get(db.Report, reportId, {
          transaction,
          lock: transaction.LOCK.UPDATE,
        });
        if (await db.WorkOrder.count({ where: { reportId }, transaction }))
          fail(409, "이미 정비 작업이 있습니다.");
        if (!["REPORTED", "CONFIRMED"].includes(report.status))
          fail(409, "현재 신고 상태에서는 작업을 만들 수 없습니다.");
        const work = await db.WorkOrder.create(
          {
            reportId,
            dueAt,
            status: "OPEN",
            resolutionNote: req.body.resolutionNote
              ? text(req.body.resolutionNote, "처리 결과", 10000)
              : null,
          },
          { transaction },
        );
        await report.update({ status: "CONFIRMED" }, { transaction });
        return work;
      });
      res.status(201).json(row);
    }),
  );
  r.get(
    "/:id",
    wrap(async (req, res) =>
      res.json(await get(db.WorkOrder, req.params.id, { include })),
    ),
  );
  r.patch(
    "/:id",
    wrap(async (req, res) => {
      const data = {};
      if (req.body.dueAt !== undefined) data.dueAt = date(req.body.dueAt);
      if (req.body.resolutionNote !== undefined)
        data.resolutionNote = text(req.body.resolutionNote, "처리 결과", 10000);
      if (!Object.keys(data).length) fail(400, "수정할 필드가 없습니다.");
      res.json(
        await change(req.params.id, async (row, report, transaction) => {
          if (["COMPLETED", "CANCELLED"].includes(row.status))
            fail(409, "종료된 작업은 수정할 수 없습니다.");
          return row.update(data, { transaction });
        }),
      );
    }),
  );
  r.patch(
    "/:id/assignee",
    wrap(async (req, res) => {
      const assigneeId = text(req.body.assigneeId, "담당자 ID", 100);
      res.json(
        await change(req.params.id, async (row, report, transaction) => {
          if (!(await db.User.findByPk(assigneeId, { transaction })))
            fail(404, "담당자가 존재하지 않습니다.");
          if (!["OPEN", "ASSIGNED"].includes(row.status))
            fail(409, "대기·배정 상태에서만 담당자를 변경할 수 있습니다.");
          return row.update(
            { assigneeId, status: "ASSIGNED" },
            { transaction },
          );
        }),
      );
    }),
  );
  r.patch(
    "/:id/status",
    wrap(async (req, res) => {
      const status = enumeration(req.body.status, states, "상태");
      res.json(
        await change(req.params.id, async (row, report, transaction) => {
          const allowed = {
            OPEN: ["CANCELLED"],
            ASSIGNED: ["IN_PROGRESS", "CANCELLED"],
            IN_PROGRESS: ["COMPLETED", "CANCELLED"],
            CANCELLED: ["OPEN"],
          };
          if (!allowed[row.status]?.includes(status))
            fail(409, "허용되지 않는 상태 변경입니다.");
          const data = { status };
          if (status === "COMPLETED") {
            data.resolutionNote = text(
              req.body.resolutionNote || row.resolutionNote,
              "처리 결과",
              10000,
            );
            data.completedAt = new Date();
          }
          if (status === "OPEN") {
            data.assigneeId = null;
            data.completedAt = null;
          }
          await row.update(data, { transaction });
          await report.update(
            {
              status:
                status === "COMPLETED"
                  ? "RESOLVED"
                  : status === "IN_PROGRESS"
                    ? "IN_PROGRESS"
                    : "CONFIRMED",
            },
            { transaction },
          );
          return row;
        }),
      );
    }),
  );
  return r;
};
