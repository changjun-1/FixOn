// Only business fields enter the history; credentials and provider tokens never do.
function reportSnapshot(report) {
    return { status: report.status, priority: report.priority };
}

function workSnapshot(work, report) {
    return {
        status: work.status,
        reportStatus: report.status,
        assigneeId: work.assigneeId || null,
        dueAt: work.dueAt,
        resolutionNote: work.resolutionNote || null,
    };
}

async function recordHistory(db, actor, reportId, action, before, after, transaction, workOrderId = null) {
    return db.ReportHistory.create({
        reportId, actorId: actor.id, actorName: actor.name,
        action, before, after, workOrderId,
    }, { transaction });
}

module.exports = { reportSnapshot, workSnapshot, recordHistory };
