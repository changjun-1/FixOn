const { workSnapshot, recordHistory } = require("./reportHistory");

const { checkDependencies, useParts } = require("./workRelations");
const { fail, text } = require("../routes/helpers");

const transitions = {
    OPEN: ["CANCELLED"],
    ASSIGNED: ["IN_PROGRESS", "CANCELLED"],
    IN_PROGRESS: ["SUBMITTED", "CANCELLED"],
    SUBMITTED: ["COMPLETED", "IN_PROGRESS"],
    CANCELLED: ["OPEN"],
};

function missing() {
    return Object.assign(new Error("대상을 찾을 수 없습니다."), { status: 404 });
}

// Lock the report before the work order so all changes use the same lock order.
async function changeWork(db, value, actor, action, change) {
    const snapshot = await db.WorkOrder.findByPk(value);
    if (!snapshot) throw missing();
    return db.sequelize.transaction(async (transaction) => {
        const options = { transaction, lock: transaction.LOCK.UPDATE };
        const report = await db.Report.findByPk(snapshot.reportId, options);
        const work = await db.WorkOrder.findByPk(value, options);
        if (!report || !work) throw missing();
        const before = workSnapshot(work, report);
        const result = await change(work, report, transaction);
        const after = workSnapshot(work, report);
        if (after.assigneeId) {
            const assignee = await db.User.findByPk(after.assigneeId, { transaction });
            after.assigneeName = assignee?.name || null;
        }
        await recordHistory(db, actor, report.id, action, before,
            after, transaction, work.id);
        return result;
    });
}

async function setWorkStatus(db, work, report, status, input, actor, transaction) {
    if (!transitions[work.status]?.includes(status))
        throw Object.assign(new Error("허용되지 않는 상태 변경입니다."), { status: 409 });
    const reviewing = work.status === "SUBMITTED";
    if ((reviewing || ["CANCELLED", "OPEN"].includes(status)) && actor.role !== "ADMIN")
        fail(403, "관리자만 검수·취소·재개할 수 있습니다.");
    const data = { status };
    if (status === "IN_PROGRESS" || status === "SUBMITTED")
        await checkDependencies(db, work, transaction);
    if (status === "SUBMITTED") {
        data.resolutionNote = text(input.resolutionNote || work.resolutionNote, "처리 결과", 10000);
        if (input.parts !== undefined) await useParts(db, work, input.parts, actor, transaction);
    }
    if (reviewing) {
        const approved = status === "COMPLETED";
        await db.WorkReview.create({
            workOrderId: work.id, reviewerId: actor.id,
            decision: approved ? "APPROVED" : "REJECTED",
            comment: approved && !input.comment ? null : text(input.comment, "검수 의견", 5000),
        }, { transaction });
        if (approved) data.completedAt = new Date();
    }
    if (status === "OPEN") {
        await db.WorkAssignment.destroy({ where: { workOrderId: work.id }, transaction });
        data.assigneeId = null;
        data.completedAt = null;
    }
    await work.update(data, { transaction });
    await syncReportStatus(db, report, transaction);
    return work;
}

async function syncReportStatus(db, report, transaction) {
    const work = await db.WorkOrder.findAll({
        where: { reportId: report.id },
        attributes: ["status"],
        transaction,
        lock: transaction.LOCK.UPDATE,
    });
    const active = work.filter((item) => item.status !== "CANCELLED");
    let status = "CONFIRMED";
    if (active.length && active.every((item) => item.status === "COMPLETED")) {
        status = "RESOLVED";
    } else if (active.some((item) => ["IN_PROGRESS", "SUBMITTED", "COMPLETED"].includes(item.status))) {
        status = "IN_PROGRESS";
    }
    await report.update({ status }, { transaction });
}

module.exports = { changeWork, setWorkStatus, syncReportStatus };
