const c = require("./setup")();
test("일반 사용자 주요 화면이 HTML로 렌더링된다", async () => {
    for (const url of ["/", "/reports", "/facilities", "/categories", "/reports/" + c.report.id]) {
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

test("로그인·회원가입에는 업무 사이드바가 없고 로그인 후에만 메뉴가 보인다", async () => {
    for (const url of ["/login", "/register"]) {
        const response = await c.anonymous.get(url);
        expect(response.status).toBe(200);
        expect(response.text).toContain('class="auth-page"');
        expect(response.text).not.toContain("<aside>");
        expect(response.text).not.toContain('aria-label="주요 메뉴"');
        expect(response.text).toContain('id="auth-form"');
    }
    const workspace = await c.student.get("/");
    expect(workspace.text).toContain('class="workspace-page"');
    expect(workspace.text).toContain('aria-label="주요 메뉴"');
    expect(workspace.text).toContain('id="logout"');
});

test("로그인한 회원은 로그인·가입 화면 대신 대시보드로 이동한다", async () => {
    expect((await c.student.get("/login")).headers.location).toBe("/");
    expect((await c.admin.get("/register")).headers.location).toBe("/");
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
