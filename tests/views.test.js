const c = require("./setup")();
test("일반 사용자 주요 화면이 HTML로 렌더링된다", async () => {
  for (const url of [
    "/",
    "/reports",
    "/facilities",
    "/categories",
    "/reports/" + c.report.id,
  ]) {
    const r = await c.student.get(url);
    expect(r.status).toBe(200);
    expect(r.headers["content-type"]).toContain("text/html");
    expect(r.text).toContain("FixOn");
  }
});
test("관리자 화면 렌더링·일반 사용자 관리자 화면 차단", async () => {
  for (const url of ["/work-orders", "/users"]) {
    expect((await c.admin.get(url)).status).toBe(200);
    expect((await c.student.get(url)).status).toBe(403);
  }
});
test("비로그인 화면 이동·가입 화면·알 수 없는 API", async () => {
  expect((await c.anonymous.get("/")).status).toBe(302);
  expect((await c.anonymous.get("/login")).status).toBe(200);
  expect((await c.anonymous.get("/register")).status).toBe(200);
  expect((await c.anonymous.get("/api/unknown")).status).toBe(404);
});
test("회원 목록·본인 정보에 비밀번호가 노출되지 않는다", async () => {
  const me = await c.student.get("/api/users/me");
  expect(me.body.id).toBe("student");
  expect(me.body.password).toBeUndefined();
  const list = await c.admin.get("/api/users");
  expect(list.body.data).toHaveLength(3);
  for (const user of list.body.data) expect(user.password).toBeUndefined();
  expect((await c.student.get("/api/users")).status).toBe(403);
});
