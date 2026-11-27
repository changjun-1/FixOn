const request = require("supertest");
const { createApp } = require("../app");

const keys = ["APP_URL", "KAKAO_CLIENT_ID", "KAKAO_CLIENT_SECRET", "SESSION_STORE"];
let originalEnv, tokenCalls, app, db, accounts;

beforeEach(() => {
    originalEnv = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
    tokenCalls = [];
    Object.assign(process.env, {
        APP_URL: "http://localhost:3000",
        KAKAO_CLIENT_ID: "kakao-test",
        KAKAO_CLIENT_SECRET: "kakao-secret",
        SESSION_STORE: "memory",
    });
    accounts = new Map();
    db = {
        User: {
            findByPk: jest.fn(async (id) => accounts.get(id) || null),
            findOrCreate: jest.fn(async ({ where, defaults }) => {
                if (!accounts.has(where.id)) {
                    const user = { id: where.id, ...defaults };
                    user.toJSON = () => ({ id: user.id, name: user.name, role: user.role });
                    accounts.set(user.id, user);
                }
                return [accounts.get(where.id), true];
            }),
        },
    };
    app = createApp(db);
    for (const provider of ["kakao"]) {
        const strategy = app.locals.passport._strategy(provider);
        strategy._oauth2.getOAuthAccessToken = jest.fn((code, params, done) => {
            tokenCalls.push({ provider, code, params });
            done(null, "private-token", null, {});
        });
        strategy.userProfile = jest.fn((accessToken, done) => done(null,
            { id: 123456, username: "카카오 학생" }));
    }
});

afterEach(() => {
    for (const key of keys) {
        if (originalEnv[key] === undefined) delete process.env[key];
        else process.env[key] = originalEnv[key];
    }
});

async function begin(agent, provider) {
    const response = await agent.get(`/auth/${provider}`);
    expect(response.status).toBe(302);
    return new URL(response.headers.location);
}

test("키 미설정과 알 수 없는 제공자를 안전하게 처리한다", async () => {
    delete process.env.KAKAO_CLIENT_SECRET;
    expect((await request(app).get("/auth/kakao")).headers.location).toBe("/login?social=unavailable");
    expect((await request(app).get("/auth/toString")).status).toBe(404);
    expect(tokenCalls).toHaveLength(0);
});

test("카카오 state가 틀리면 거절하고 기존 state도 재사용할 수 없다", async () => {
    const agent = request.agent(app);
    const url = await begin(agent, "kakao");
    expect(url.origin).toBe("https://kauth.kakao.com");
    const state = url.searchParams.get("state");
    expect(state).toHaveLength(64);
    for (const value of ["wrong", state]) {
        const result = await agent.get("/auth/kakao/callback").query({ state: value, code: "fake" });
        expect(result.headers.location).toBe("/login?social=invalid");
    }
    expect(tokenCalls).toHaveLength(0);
});

test.each(["kakao"])("%s 로그인으로 계정 생성, 재로그인, 세션 및 로그아웃", async (provider) => {
    const agent = request.agent(app);
    for (let attempt = 0; attempt < 2; attempt++) {
        const url = await begin(agent, provider);
        const response = await agent.get(`/auth/${provider}/callback`).query({
            state: url.searchParams.get("state"), code: "valid-code",
        });
        expect(response.headers.location).toBe("/");
        const me = await agent.get("/api/users/me");
        expect(me.status).toBe(200);
        expect(me.body.id).toMatch(new RegExp(`^oauth:${provider}:`));
        expect(me.body.role).toBe("USER");
        expect(me.body.password).toBeUndefined();
    }
    expect(accounts.size).toBe(1);
    expect(db.User.findOrCreate).toHaveBeenCalledTimes(1);
    const token = (await agent.get("/api/users/csrf")).body.csrfToken;
    expect((await agent.post("/api/users/logout").set("X-CSRF-Token", token)).status).toBe(200);
    expect((await agent.get("/api/users/me")).status).toBe(401);
});

test("사용자 취소 및 외부 서버 오류에는 계정을 만들지 않는다", async () => {
    const agent = request.agent(app);
    let url = await begin(agent, "kakao");
    expect((await agent.get("/auth/kakao/callback").query({ state: url.searchParams.get("state"), error: "access_denied" })).headers.location).toBe("/login?social=cancelled");
    url = await begin(agent, "kakao");
    app.locals.passport._strategy("kakao")._oauth2.getOAuthAccessToken.mockImplementation((code, params, done) => done(new Error("모의 제공자 오류")));
    expect((await agent.get("/auth/kakao/callback").query({ state: url.searchParams.get("state"), code: "bad-code" })).headers.location).toBe("/login?social=failed");
    expect(accounts.size).toBe(0);
});

test("로그인 화면에는 카카오만 표시되고 구글 인증 경로는 닫혀 있다", async () => {
    const response = await request(app).get("/login");
    expect(response.status).toBe(200);
    expect(response.text).toContain('href="/auth/kakao"');
    expect(response.text).not.toContain('href="/auth/google"');
    for (const url of ["/auth/google", "/auth/google/callback"])
        expect((await request(app).get(url)).status).toBe(404);
});
