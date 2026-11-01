const c = require("./setup")();
test("로그인 사용자의 신고는 201이며 DB에 저장된다", async () => {
  const r = await c.student.post("/api/reports", {
    title: "조명 고장",
    description: "불이 꺼짐",
    facilityId: c.facility.id,
    categoryId: c.category.id,
    userId: "other",
    status: "RESOLVED",
  });
  expect(r.status).toBe(201);
  const row = await c.db.Report.findByPk(r.body.id);
  expect(row.userId).toBe("student");
  expect(row.status).toBe("REPORTED");
});
test("필수값 누락은 400", async () => {
  expect((await c.student.post("/api/reports", {})).status).toBe(400);
});
test("검색과 페이지네이션이 실제 데이터에 맞는다", async () => {
  const r = await c.student.get("/api/reports?keyword=프로젝터&page=0&size=1");
  expect(r.status).toBe(200);
  expect(r.body.data).toHaveLength(1);
  expect(r.body.pagination.total).toBe(1);
});
test("없는 신고는 404, 잘못된 ID는 400", async () => {
  expect((await c.student.get("/api/reports/99999")).status).toBe(404);
  expect((await c.student.get("/api/reports/nope")).status).toBe(400);
});
test("다른 사용자는 신고 조회·수정 불가", async () => {
  expect((await c.other.get("/api/reports/" + c.report.id)).status).toBe(403);
  expect(
    (await c.other.patch("/api/reports/" + c.report.id, { title: "변경" }))
      .status,
  ).toBe(403);
});
test("일반 사용자 상태 변경은 403, 관리자 잘못된 전이는 409", async () => {
  const url = `/api/reports/${c.report.id}/status`;
  expect((await c.student.patch(url, { status: "CONFIRMED" })).status).toBe(
    403,
  );
  expect((await c.admin.patch(url, { status: "RESOLVED" })).status).toBe(409);
  expect((await c.admin.patch(url, { status: "CONFIRMED" })).status).toBe(200);
});
test("통계는 실제 신고와 일치하고 사용자별 범위를 지킨다", async () => {
  const r = await c.admin.get("/api/reports/stats");
  expect(r.body.total).toBe(1);
  expect(r.body.REPORTED).toBe(1);
  expect((await c.other.get("/api/reports/stats")).body.total).toBe(0);
});
test("우선순위 변경·접수 신고 수정·삭제가 DB에 반영된다", async () => {
  const url = `/api/reports/${c.report.id}`;
  expect(
    (await c.admin.patch(url + "/priority", { priority: "URGENT" })).body
      .priority,
  ).toBe("URGENT");
  expect(
    (await c.student.patch(url, { title: "수정된 제목" })).body.title,
  ).toBe("수정된 제목");
  expect((await c.student.delete(url)).status).toBe(204);
  expect(await c.db.Report.findByPk(c.report.id)).toBeNull();
});
test("인증 없는 조회 401, CSRF 없는 변경 403", async () => {
  expect((await c.anonymous.get("/api/reports")).status).toBe(401);
  const request = require("supertest");
  expect((await request(c.app).post("/api/reports").send({})).status).toBe(403);
});
test("회원 가입으로 관리자 승격 불가, 비밀번호 해시 저장", async () => {
  const r = await c.anonymous.post("/api/users/register", {
    id: "newuser",
    name: "신규",
    password: "Password123!",
    role: "ADMIN",
  });
  expect(r.status).toBe(201);
  expect(r.body.role).toBe("USER");
  expect(r.body.password).toBeUndefined();
  expect((await c.db.User.findByPk("newuser")).password).not.toBe(
    "Password123!",
  );
});
