const c = require("./setup")();
test("관리자 분류 등록·수정·조회", async () => {
  const r = await c.admin.post("/api/categories", {
    code: "NETWORK",
    name: "네트워크",
  });
  expect(r.status).toBe(201);
  const url = "/api/categories/" + r.body.id;
  expect((await c.admin.patch(url, { name: "통신" })).status).toBe(200);
  expect((await c.student.get(url)).body.name).toBe("통신");
});
test("중복 분류 코드는 409", async () => {
  expect(
    (await c.admin.post("/api/categories", { code: "AV", name: "중복" }))
      .status,
  ).toBe(409);
});
test("없는 분류는 404", async () => {
  expect((await c.student.get("/api/categories/99999")).status).toBe(404);
});
test("사용 중 분류 삭제는 409, 연결 신고는 유지", async () => {
  expect(
    (await c.admin.delete("/api/categories/" + c.category.id)).status,
  ).toBe(409);
  expect(await c.db.Report.count()).toBe(1);
});
test("활성 변경과 비활성 분류 신고 등록 거절", async () => {
  const url = `/api/categories/${c.category.id}/active`;
  expect((await c.admin.patch(url, { active: false })).status).toBe(200);
  expect(
    (
      await c.student.post("/api/reports", {
        title: "고장",
        description: "불량",
        facilityId: c.facility.id,
        categoryId: c.category.id,
      })
    ).status,
  ).toBe(409);
  expect((await c.admin.patch(url, { active: true })).body.active).toBe(true);
});
test("분류별 신고·일반 사용자 수정 제한", async () => {
  expect(
    (await c.student.get(`/api/categories/${c.category.id}/reports`)).body.data,
  ).toHaveLength(1);
  expect(
    (
      await c.student.patch("/api/categories/" + c.category.id, {
        name: "변경",
      })
    ).status,
  ).toBe(403);
});
test("참조 없는 분류는 삭제 가능", async () => {
  const row = await c.db.Category.create({ code: "EMPTY", name: "미사용" });
  expect((await c.admin.delete("/api/categories/" + row.id)).status).toBe(204);
});
