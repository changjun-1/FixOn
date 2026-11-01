const c = require("./setup")();
test("관리자 시설 등록·수정이 DB에 반영된다", async () => {
  const r = await c.admin.post("/api/facilities", {
    name: "냉방기",
    building: "도서관",
    room: "201",
    facilityType: "HVAC",
  });
  expect(r.status).toBe(201);
  expect(
    (await c.admin.patch("/api/facilities/" + r.body.id, { room: "202" }))
      .status,
  ).toBe(200);
  expect((await c.db.Facility.findByPk(r.body.id)).room).toBe("202");
});
test("시설 검색·필터와 없는 시설 조회", async () => {
  expect(
    (await c.student.get("/api/facilities?building=본관&active=true")).body
      .pagination.total,
  ).toBe(1);
  expect(
    (await c.student.get("/api/facilities?building=별관")).body.data,
  ).toHaveLength(0);
  expect((await c.student.get("/api/facilities/99999")).status).toBe(404);
});
test("참조 중 시설 삭제는 409", async () => {
  expect(
    (await c.admin.delete("/api/facilities/" + c.facility.id)).status,
  ).toBe(409);
  expect(await c.db.Facility.findByPk(c.facility.id)).not.toBeNull();
});
test("시설별 신고 조회와 사용자별 범위", async () => {
  const url = `/api/facilities/${c.facility.id}/reports`;
  expect((await c.student.get(url)).body.data[0].id).toBe(c.report.id);
  expect((await c.other.get(url)).body.data).toHaveLength(0);
});
test("정비 이력에 다른 시설 작업이 섞이지 않는다", async () => {
  await c.db.WorkOrder.create({ reportId: c.report.id, dueAt: new Date() });
  const f = await c.db.Facility.create({
    name: "책상",
    building: "별관",
    room: "1",
    facilityType: "FURNITURE",
  });
  const r = await c.db.Report.create({
    title: "다른 시설",
    description: "고장",
    userId: "student",
    facilityId: f.id,
    categoryId: c.category.id,
  });
  await c.db.WorkOrder.create({ reportId: r.id, dueAt: new Date() });
  const result = await c.admin.get(
    `/api/facilities/${c.facility.id}/maintenance-history`,
  );
  expect(result.body.data).toHaveLength(1);
  expect(result.body.data[0].reportId).toBe(c.report.id);
});
test("일반 사용자 등록은 403, 참조 없는 시설 삭제는 204", async () => {
  expect((await c.student.post("/api/facilities", {})).status).toBe(403);
  const row = await c.db.Facility.create({
    name: "의자",
    building: "본관",
    room: "2",
    facilityType: "FURNITURE",
  });
  expect((await c.admin.delete("/api/facilities/" + row.id)).status).toBe(204);
});
