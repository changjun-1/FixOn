const { workSnapshot, recordHistory } = require("./reportHistory");

const transitions = {
    OPEN: ["CANCELLED"],
    ASSIGNED: ["IN_PROGRESS", "CANCELLED"],
    IN_PROGRESS: ["COMPLETED", "CANCELLED"],
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

async function setWorkStatus(work, report, status, resolutionNote, transaction) {
    if (!transitions[work.status]?.includes(status))
        throw Object.assign(new Error("허용되지 않는 상태 변경입니다."), { status: 409 });
    const data = { status };
    if (status === "COMPLETED") {
        if (!resolutionNote)
            throw Object.assign(new Error("완료 시 처리 결과가 필요합니다."), { status: 400 });
        data.resolutionNote = resolutionNote;
        data.completedAt = new Date();
    }
    if (status === "OPEN") {
        data.assigneeId = null;
        data.completedAt = null;
    }
    await work.update(data, { transaction });
    await report.update({
        status: status === "COMPLETED" ? "RESOLVED"
            : status === "IN_PROGRESS" ? "IN_PROGRESS" : "CONFIRMED",
    }, { transaction });
    return work;
}

module.exports = { changeWork, setWorkStatus };
