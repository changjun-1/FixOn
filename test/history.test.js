const context = require("./setup")();

test("신고 접수 이력은 작성자와 함께 저장되고 본인·관리자만 조회한다", async () => {
    const response = await context.student.post("/api/reports", {
        title: "이력 검증 신고", description: "전원이 꺼집니다.",
        facilityId: context.facility.id, categoryId: context.category.id,
    });
    expect(response.status).toBe(201);
    const url = `/api/reports/${response.body.id}/history`;
    const history = await context.student.get(url);
    expect(history.status).toBe(200);
    expect(history.body.data).toHaveLength(1);
    expect(history.body.data[0]).toMatchObject({
        action: "REPORT_CREATED", actorId: "student", actorName: "학생",
        before: null, after: { status: "REPORTED", priority: "NORMAL" },
    });
    expect((await context.admin.get(url)).status).toBe(200);
    expect((await context.other.get(url)).status).toBe(403);
    expect((await context.anonymous.get(url)).status).toBe(401);
});

test("생성·배정·진행·완료 이력과 상태는 같은 순서로 저장된다", async () => {
    const created = await context.admin.post("/api/work-orders", {
        reportId: context.report.id, dueAt: "2030-12-01T09:00:00Z",
    });
    expect(created.status).toBe(201);
    const url = `/api/work-orders/${created.body.id}`;
    expect((await context.admin.patch(url + "/assignee", { assigneeId: "student" })).status).toBe(200);
    expect((await context.admin.patch(url + "/status", { status: "IN_PROGRESS" })).status).toBe(200);
    expect((await context.admin.patch(url + "/status", {
        status: "COMPLETED", resolutionNote: "부품 교체 완료",
    })).status).toBe(200);
    const history = await context.student.get(`/api/reports/${context.report.id}/history?sort=oldest&size=2`);
    expect(history.body.pagination.total).toBe(4);
    expect(history.body.data.map((item) => item.action)).toEqual(["WORK_CREATED", "WORK_ASSIGNED"]);
    const last = await context.student.get(`/api/reports/${context.report.id}/history`);
    expect(last.body.data[0]).toMatchObject({
        actorId: "admin", before: { status: "IN_PROGRESS", reportStatus: "IN_PROGRESS" },
        after: { status: "COMPLETED", reportStatus: "RESOLVED", resolutionNote: "부품 교체 완료" },
    });
    const count = await context.db.ReportHistory.count();
    expect((await context.admin.patch(url + "/status", { status: "IN_PROGRESS" })).status).toBe(409);
    expect(await context.db.ReportHistory.count()).toBe(count);
});

test("이력 저장 실패 시 신고 상태 변경도 롤백한다", async () => {
    const original = context.db.ReportHistory.create;
    context.db.ReportHistory.create = async () => { throw new Error("이력 저장 실패 테스트"); };
    try {
        const response = await context.admin.patch(`/api/reports/${context.report.id}/status`, { status: "CONFIRMED" });
        expect(response.status).toBe(500);
        expect((await context.db.Report.findByPk(context.report.id)).status).toBe("REPORTED");
        expect(await context.db.ReportHistory.count()).toBe(0);
    } finally {
        context.db.ReportHistory.create = original;
    }
});

test("작업 이력 저장 실패 시 작업·신고 상태 모두 롤백한다", async () => {
    const original = context.db.ReportHistory.create;
    context.db.ReportHistory.create = async () => { throw new Error("이력 저장 실패 테스트"); };
    try {
        const response = await context.admin.post("/api/work-orders", {
            reportId: context.report.id, dueAt: "2030-12-01T09:00:00Z",
        });
        expect(response.status).toBe(500);
        expect(await context.db.WorkOrder.count()).toBe(0);
        expect((await context.db.Report.findByPk(context.report.id)).status).toBe("REPORTED");
    } finally {
        context.db.ReportHistory.create = original;
    }
});

test("우선순위와 내용 변경 이력을 기록하고 신고 삭제 시 함께 제거한다", async () => {
    const url = `/api/reports/${context.report.id}`;
    expect((await context.admin.patch(url + "/priority", { priority: "URGENT" })).status).toBe(200);
    expect((await context.student.patch(url, { title: "제목 수정" })).status).toBe(200);
    expect(await context.db.ReportHistory.count()).toBe(2);
    const response = await context.student.get(url + "/history");
    expect(response.body.data[1]).toMatchObject({
        action: "REPORT_PRIORITY_CHANGED", before: { priority: "NORMAL" }, after: { priority: "URGENT" },
    });
    expect((await context.student.delete(url)).status).toBe(204);
    expect(await context.db.ReportHistory.count()).toBe(0);
});
