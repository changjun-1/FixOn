const c = require("./setup")();
const payload = () => ({
  reportId: c.report.id,
  dueAt: "2030-12-01T09:00:00Z",
});
async function work() {
  const r = await c.admin.post("/api/work-orders", payload());
  expect(r.status).toBe(201);
  return r.body;
}
test("정상 생성·조회·수정과 중복 생성 거절", async () => {
  const row = await work();
  expect((await c.admin.get("/api/work-orders/" + row.id)).body.Report.id).toBe(
    c.report.id,
  );
  expect(
    (
      await c.admin.patch("/api/work-orders/" + row.id, {
        resolutionNote: "점검 예정",
      })
    ).status,
  ).toBe(200);
  expect((await c.admin.post("/api/work-orders", payload())).status).toBe(409);
  expect(await c.db.WorkOrder.count()).toBe(1);
});
test("없는 신고에 연결하는 작업은 404", async () => {
  expect(
    (await c.admin.post("/api/work-orders", { ...payload(), reportId: 99999 }))
      .status,
  ).toBe(404);
});
test("일반 사용자 정비 API 접근은 403", async () => {
  expect((await c.student.get("/api/work-orders")).status).toBe(403);
  expect((await c.student.post("/api/work-orders", payload())).status).toBe(
    403,
  );
});
test("없는 담당자 거절·유효 담당자 배정", async () => {
  const row = await work(),
    url = `/api/work-orders/${row.id}/assignee`;
  expect((await c.admin.patch(url, { assigneeId: "missing" })).status).toBe(
    404,
  );
  expect(
    (await c.admin.patch(url, { assigneeId: "student" })).body.status,
  ).toBe("ASSIGNED");
  expect((await c.db.WorkOrder.findByPk(row.id)).assigneeId).toBe("student");
});
test("잘못된 전이는 409, 완료 시 처리 결과와 신고 상태 동기화", async () => {
  const row = await work(),
    url = `/api/work-orders/${row.id}`;
  expect(
    (await c.admin.patch(url + "/status", { status: "COMPLETED" })).status,
  ).toBe(409);
  await c.admin.patch(url + "/assignee", { assigneeId: "student" });
  expect(
    (await c.admin.patch(url + "/status", { status: "IN_PROGRESS" })).status,
  ).toBe(200);
  expect(
    (await c.admin.patch(url + "/status", { status: "COMPLETED" })).status,
  ).toBe(400);
  expect(
    (
      await c.admin.patch(url + "/status", {
        status: "COMPLETED",
        resolutionNote: "전원 장치 교체",
      })
    ).status,
  ).toBe(200);
  expect((await c.db.Report.findByPk(c.report.id)).status).toBe("RESOLVED");
  expect((await c.db.WorkOrder.findByPk(row.id)).completedAt).not.toBeNull();
  expect(
    (await c.admin.patch(url + "/status", { status: "IN_PROGRESS" })).status,
  ).toBe(409);
});
test("기한 초과 조회·통계는 완료·취소 작업 제외", async () => {
  const row = await c.db.WorkOrder.create({
    reportId: c.report.id,
    dueAt: "2020-01-01T00:00:00Z",
  });
  expect(
    (await c.admin.get("/api/work-orders/overdue")).body.data,
  ).toHaveLength(1);
  expect((await c.admin.get("/api/work-orders/summary")).body.overdue).toBe(1);
  await row.update({
    status: "COMPLETED",
    resolutionNote: "완료",
    completedAt: new Date(),
  });
  expect(
    (await c.admin.get("/api/work-orders/overdue")).body.data,
  ).toHaveLength(0);
  expect((await c.admin.get("/api/work-orders/summary")).body.overdue).toBe(0);
});
test("작업이 있는 신고 삭제·직접 상태 변경 거절", async () => {
  await work();
  expect((await c.admin.delete("/api/reports/" + c.report.id)).status).toBe(
    409,
  );
  expect(
    (
      await c.admin.patch(`/api/reports/${c.report.id}/status`, {
        status: "REJECTED",
      })
    ).status,
  ).toBe(409);
});
test("취소·재개는 신고 상태를 보존하고 담당자를 초기화한다", async () => {
  const row = await work(),
    url = `/api/work-orders/${row.id}`;
  await c.admin.patch(url + "/assignee", { assigneeId: "student" });
  expect(
    (await c.admin.patch(url + "/status", { status: "CANCELLED" })).status,
  ).toBe(200);
  const reopened = await c.admin.patch(url + "/status", { status: "OPEN" });
  expect(reopened.status).toBe(200);
  expect(reopened.body.assigneeId).toBeNull();
  expect((await c.db.Report.findByPk(c.report.id)).status).toBe("CONFIRMED");
});
test("동일 신고 동시 작업 생성도 하나만 성공한다", async () => {
  const results = await Promise.all([
    c.admin.post("/api/work-orders", payload()),
    c.admin.post("/api/work-orders", payload()),
  ]);
  expect(results.map((x) => x.status).sort()).toEqual([201, 409]);
  expect(await c.db.WorkOrder.count()).toBe(1);
});
