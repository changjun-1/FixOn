const request = require("supertest");
const { createApp } = require("../app");

const keys = ["APP_URL", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "KAKAO_CLIENT_ID", "KAKAO_CLIENT_SECRET", "SESSION_STORE"];
let originalEnv, tokenCalls, app, db, accounts;

beforeEach(() => {
    originalEnv = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
    tokenCalls = [];
    Object.assign(process.env, {
        APP_URL: "http://localhost:3000",
        GOOGLE_CLIENT_ID: "google-test",
        GOOGLE_CLIENT_SECRET: "google-secret",
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
    for (const provider of ["google", "kakao"]) {
        const strategy = app.locals.passport._strategy(provider);
        strategy._oauth2.getOAuthAccessToken = jest.fn((code, params, done) => {
            tokenCalls.push({ provider, code, params });
            done(null, "private-token", null, {});
        });
        strategy.userProfile = jest.fn((accessToken, done) => done(null,
            provider === "google"
                ? { id: "123456", displayName: "구글 학생" }
                : { id: 123456, username: "카카오 학생" }));
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
    delete process.env.GOOGLE_CLIENT_SECRET;
    expect((await request(app).get("/auth/google")).headers.location).toBe("/login?social=unavailable");
    expect((await request(app).get("/auth/toString")).status).toBe(404);
    expect(tokenCalls).toHaveLength(0);
});

test("Google 인증 요청에 state, PKCE, 고정 callback을 포함한다", async () => {
    const url = await begin(request.agent(app), "google");
    expect(url.origin).toBe("https://accounts.google.com");
    expect(url.searchParams.get("state")).toHaveLength(64);
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("redirect_uri")).toBe("http://localhost:3000/auth/google/callback");
    expect(url.searchParams.has("client_secret")).toBe(false);
});

test("잘못된 state와 다른 제공자의 응답은 거절하고 재사용하지 못한다", async () => {
    const agent = request.agent(app);
    const url = await begin(agent, "google");
    const state = url.searchParams.get("state");
    expect((await agent.get("/auth/kakao/callback").query({ state, code: "fake" })).headers.location).toBe("/login?social=invalid");
    expect((await agent.get("/auth/google/callback").query({ state, code: "fake" })).headers.location).toBe("/login?social=invalid");
    expect(tokenCalls).toHaveLength(0);
});

test.each(["google", "kakao"])("%s 로그인으로 계정 생성, 재로그인, 세션 및 로그아웃", async (provider) => {
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
    let url = await begin(agent, "google");
    expect((await agent.get("/auth/google/callback").query({ state: url.searchParams.get("state"), error: "access_denied" })).headers.location).toBe("/login?social=cancelled");
    url = await begin(agent, "google");
    app.locals.passport._strategy("google")._oauth2.getOAuthAccessToken.mockImplementation((code, params, done) => done(new Error("모의 제공자 오류")));
    expect((await agent.get("/auth/google/callback").query({ state: url.searchParams.get("state"), code: "bad-code" })).headers.location).toBe("/login?social=failed");
    expect(accounts.size).toBe(0);
});

test("로그인 화면에 두 소셜 로그인 링크가 표시된다", async () => {
    const response = await request(app).get("/login");
    expect(response.status).toBe(200);
    expect(response.text).toContain('href="/auth/kakao"');
    expect(response.text).toContain('href="/auth/google"');
});
