const { Router } = require("express");
const { admin, login } = require("../middleware/auth");
const { Op, wrap, text, id, date, enumeration, get, list, fail } = require("./helpers");
const { changeWork, setWorkStatus, syncReportStatus } = require("../services/workOrder");
const { workSnapshot, recordHistory } = require("../services/reportHistory");
const { workRelations, canWork, setDependencies, receivePart } = require("../services/workRelations");
const states = ["OPEN", "ASSIGNED", "IN_PROGRESS", "SUBMITTED", "COMPLETED", "CANCELLED"];

function createRouter(db) {
    const r = Router();
    r.use(login);
    async function assignedTo(userId) {
        const assignments = await db.WorkAssignment.findAll({ where: { userId }, attributes: ["workOrderId"] });
        return { [Op.or]: [{ assigneeId: userId }, { id: assignments.map((item) => item.workOrderId) }] };
    }
    async function scope(req) {
        if (req.user.role !== "ADMIN") return assignedTo(req.user.id);
        return req.query.assigneeId ? assignedTo(text(req.query.assigneeId, "담당자", 100)) : {};
    }
    const include = [
        { model: db.Report, include: [db.Facility] },
        { model: db.User, as: "assignee", attributes: ["id", "name"] },
        ...workRelations(db),
    ];
    const overdue = () => ({
        dueAt: { [Op.lt]: new Date() },
        status: { [Op.notIn]: ["COMPLETED", "CANCELLED"] },
    });
    r.get(
        "/",
        wrap(async (req, res) => {
            const where = await scope(req);
            if (req.query.reportId !== undefined) where.reportId = id(req.query.reportId);
            if (req.query.status) where.status = enumeration(req.query.status, states, "상태");
            if (req.query.keyword) {
                const matching = await db.Report.findAll({
                    where: {
                        title: { [Op.like]: "%" + text(req.query.keyword, "검색어") + "%" },
                    },
                    attributes: ["id"],
                });
                where[Op.and] = [{ reportId: { [Op.in]: matching.map((x) => x.id) } }];
            }
            await list(db.WorkOrder, req, res, where, include);
        }),
    );
    r.get(
        "/overdue",
        wrap(async (req, res) => list(db.WorkOrder, req, res, { ...overdue(), ...await scope(req) }, include)),
    );
    r.get(
        "/summary",
        wrap(async (req, res) => {
            const rows = await db.WorkOrder.findAll({
                where: await scope(req),
                attributes: ["status", "dueAt"],
                raw: true,
            });
            const counts = Object.fromEntries(states.map((s) => [s, 0]));
            for (const row of rows) counts[row.status]++;
            res.json({
                total: rows.length,
                parts: await db.Part.findAll({ order: [["code", "ASC"]] }),
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
        admin,
        wrap(async (req, res) => {
            const reportId = id(req.body.reportId),
                dueAt = date(req.body.dueAt);
            const row = await db.sequelize.transaction(async (transaction) => {
                const report = await get(db.Report, reportId, {
                    transaction,
                    lock: transaction.LOCK.UPDATE,
                });
                if (!["REPORTED", "CONFIRMED", "IN_PROGRESS"].includes(report.status))
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
                const before = { reportStatus: report.status };
                await syncReportStatus(db, report, transaction);
                await recordHistory(db, req.user, report.id, "WORK_CREATED", before,
                    workSnapshot(work, report), transaction, work.id);
                return work;
            });
            res.status(201).json(row);
        }),
    );
    r.get(
        "/:id",
        wrap(async (req, res) => {
            const work = await get(db.WorkOrder, req.params.id, { include });
            if (!await canWork(db, work, req.user)) fail(403, "배정된 작업만 조회할 수 있습니다.");
            res.json(work);
        }),
    );
    r.patch(
        "/:id",
        admin,
        wrap(async (req, res) => {
            const data = {};
            if (req.body.dueAt !== undefined) data.dueAt = date(req.body.dueAt);
            if (req.body.resolutionNote !== undefined)
                data.resolutionNote = text(req.body.resolutionNote, "처리 결과", 10000);
            if (!Object.keys(data).length && req.body.prerequisiteIds === undefined && req.body.stockReceipt === undefined) fail(400, "수정할 필드가 없습니다.");
            res.json(
                await changeWork(db, id(req.params.id), req.user, "WORK_UPDATED", async (row, report, transaction) => {
                    if (["COMPLETED", "CANCELLED", "SUBMITTED"].includes(row.status))
                        fail(409, "종료된 작업은 수정할 수 없습니다.");
                    if (req.body.prerequisiteIds !== undefined) {
                        if (!["OPEN", "ASSIGNED"].includes(row.status)) fail(409, "시작 전 작업만 선행 조건을 변경할 수 있습니다.");
                        await setDependencies(db, row, req.body.prerequisiteIds, transaction);
                    }
                    if (req.body.stockReceipt !== undefined)
                        await receivePart(db, req.body.stockReceipt, req.user, transaction);
                    return row.update(data, { transaction });
                }),
            );
        }),
    );
    r.patch(
        "/:id/assignee",
        admin,
        wrap(async (req, res) => {
            const assigneeId = text(req.body.assigneeId, "담당자 ID", 100);
            res.json(
                await changeWork(db, id(req.params.id), req.user, "WORK_ASSIGNED", async (row, report, transaction) => {
                    if (!(await db.User.findByPk(assigneeId, { transaction })))
                        fail(404, "담당자가 존재하지 않습니다.");
                    if (!["OPEN", "ASSIGNED"].includes(row.status))
                        fail(409, "대기·배정 상태에서만 담당자를 변경할 수 있습니다.");
                    const support = req.body.supportIds ?? [];
                    if (!Array.isArray(support) || support.length > 30) fail(400, "지원 인력 목록을 확인하세요.");
                    const userIds = [...new Set([assigneeId, ...support.map((value) => text(value, "지원 인력", 100))])];
                    if (await db.User.count({ where: { id: userIds }, transaction }) !== userIds.length)
                        fail(404, "배정할 사용자를 찾을 수 없습니다.");
                    await db.WorkAssignment.destroy({ where: { workOrderId: row.id }, transaction });
                    await db.WorkAssignment.bulkCreate(userIds.map((userId) => ({
                        workOrderId: row.id, userId, role: userId === assigneeId ? "LEAD" : "SUPPORT",
                    })), { transaction });
                    return row.update({ assigneeId, status: "ASSIGNED" }, { transaction });
                }),
            );
        }),
    );
    r.patch(
        "/:id/status",
        wrap(async (req, res) => {
            const status = enumeration(req.body.status, states, "상태");
            res.json(
                await changeWork(db, id(req.params.id), req.user, "WORK_STATUS_CHANGED", async (row, report, transaction) => {
                    if (!await canWork(db, row, req.user, transaction)) fail(403, "배정된 작업만 변경할 수 있습니다.");
                    return setWorkStatus(db, row, report, status, req.body, req.user, transaction);
                }),
            );
        }),
    );
    return r;
}

module.exports = createRouter(require("../models"));
module.exports.createRouter = createRouter;
