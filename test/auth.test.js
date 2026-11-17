const request = require("supertest");
const context = require("./setup")();

test("/auth 로그인은 Passport 세션을 생성하고 새 CSRF로 로그아웃한다", async () => {
    const agent = request.agent(context.app);
    const before = (await agent.get("/api/users/csrf")).body.csrfToken;
    const response = await agent.post("/auth/login").set("X-CSRF-Token", before)
        .send({ id: "student", password: "Password123!" });
    expect(response.status).toBe(200);
    expect(response.body.csrfToken).not.toBe(before);
    expect(response.body.password).toBeUndefined();
    expect((await agent.get("/api/users/me")).body).toEqual({ id: "student", name: "학생", role: "USER" });
    expect((await agent.post("/auth/logout").set("X-CSRF-Token", before)).status).toBe(403);
    expect((await agent.post("/auth/logout").set("X-CSRF-Token", response.body.csrfToken)).status).toBe(200);
    expect((await agent.get("/api/users/me")).status).toBe(401);
});

test("Passport 역직렬화는 삭제된 회원의 세션을 로그인으로 인정하지 않는다", async () => {
    const agent = request.agent(context.app);
    const csrfToken = (await agent.get("/api/users/csrf")).body.csrfToken;
    expect((await agent.post("/auth/login").set("X-CSRF-Token", csrfToken)
        .send({ id: "other", password: "Password123!" })).status).toBe(200);
    await context.db.User.destroy({ where: { id: "other" } });
    expect((await agent.get("/api/users/me")).status).toBe(401);
});
