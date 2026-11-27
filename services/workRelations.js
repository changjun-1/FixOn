const { Op } = require("sequelize");
const { id, text, fail } = require("../routes/helpers");

function workRelations(db) {
    const userFields = ["id", "name"];
    return [
        { association: "assignments", separate: true, include: [{ model: db.User, as: "user", attributes: userFields }] },
        { association: "dependencies", separate: true, include: [{ association: "prerequisite", attributes: ["id", "status"] }] },
        { association: "partsUsed", separate: true, include: ["part"] },
        { association: "reviews", separate: true, include: [{ association: "reviewer", attributes: userFields }] },
    ];
}

async function canWork(db, work, actor, transaction) {
    if (actor.role === "ADMIN" || work.assigneeId === actor.id) return true;
    return Boolean(await db.WorkAssignment.findOne({
        where: { workOrderId: work.id, userId: actor.id }, transaction,
    }));
}

async function setDependencies(db, work, values, transaction) {
    if (!Array.isArray(values) || values.length > 50) fail(400, "선행 작업은 50개까지 지정할 수 있습니다.");
    const ids = [...new Set(values.map(id))];
    const siblings = await db.WorkOrder.findAll({ where: { reportId: work.reportId }, transaction });
    const siblingIds = new Set(siblings.map((item) => item.id));
    if (ids.some((value) => value === work.id || !siblingIds.has(value)))
        fail(400, "같은 신고의 다른 작업만 선행 작업으로 지정할 수 있습니다.");
    const links = await db.WorkDependency.findAll({
        where: { workOrderId: [...siblingIds] }, transaction,
    });
    const graph = new Map();
    for (const link of links) {
        if (!graph.has(link.workOrderId)) graph.set(link.workOrderId, []);
        graph.get(link.workOrderId).push(link.prerequisiteId);
    }
    const queue = [...ids];
    const visited = new Set();
    while (queue.length) {
        const current = queue.pop();
        if (current === work.id) fail(409, "선행 작업 관계가 순환합니다.");
        if (visited.has(current)) continue;
        visited.add(current);
        queue.push(...(graph.get(current) || []));
    }
    await db.WorkDependency.destroy({ where: { workOrderId: work.id }, transaction });
    await db.WorkDependency.bulkCreate(ids.map((prerequisiteId) => ({
        workOrderId: work.id, prerequisiteId,
    })), { transaction });
}

async function checkDependencies(db, work, transaction) {
    const waiting = await db.WorkDependency.count({
        where: { workOrderId: work.id },
        include: [{ association: "prerequisite", where: { status: { [Op.ne]: "COMPLETED" } } }],
        transaction,
    });
    if (waiting) fail(409, "선행 작업이 모두 승인된 뒤 진행할 수 있습니다.");
}

async function receivePart(db, input, actor, transaction) {
    const code = text(input?.code, "부품 코드", 40).toUpperCase();
    const name = text(input?.name, "부품 이름", 100);
    const quantity = id(input?.quantity);
    const [part] = await db.Part.findOrCreate({ where: { code }, defaults: { name, stock: 0 }, transaction });
    await part.increment("stock", { by: quantity, transaction });
    await db.StockMovement.create({ partId: part.id, actorId: actor.id, type: "IN", quantity }, { transaction });
}

async function useParts(db, work, entries, actor, transaction) {
    if (!Array.isArray(entries) || entries.length > 50) fail(400, "부품 사용 목록을 확인하세요.");
    const items = entries.map((entry) => ({ partId: id(entry?.partId), quantity: id(entry?.quantity) }));
    items.sort((a, b) => a.partId - b.partId);
    for (const { partId, quantity } of items) {
        const part = await db.Part.findByPk(partId, { transaction, lock: transaction.LOCK.UPDATE });
        if (!part) fail(404, "부품을 찾을 수 없습니다.");
        if (part.stock < quantity) fail(409, "부품 재고가 부족합니다.");
        await part.decrement("stock", { by: quantity, transaction });
        const usage = await db.WorkPartUsage.create({ workOrderId: work.id, partId, quantity }, { transaction });
        await db.StockMovement.create({ partId, usageId: usage.id, actorId: actor.id, type: "OUT", quantity }, { transaction });
    }
}

module.exports = { workRelations, canWork, setDependencies, checkDependencies, receivePart, useParts };
