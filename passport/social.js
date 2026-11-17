const crypto = require("crypto");
const bcrypt = require("bcrypt");

function settings(provider) {
    const prefix = provider.toUpperCase();
    const clientID = process.env[`${prefix}_CLIENT_ID`];
    const clientSecret = process.env[`${prefix}_CLIENT_SECRET`];
    if (!clientID || !clientSecret || !process.env.APP_URL) return null;
    try {
        const url = new URL(process.env.APP_URL);
        if (url.protocol !== "https:" &&
            !(url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname))) return null;
        return { clientID, clientSecret, callbackURL: `${url.origin}/auth/${provider}/callback` };
    } catch {
        return null;
    }
}

class StateStore {
    constructor(provider) { this.provider = provider; }
    store(req, verifier, state, meta, done) {
        const value = crypto.randomBytes(32).toString("hex");
        req.session.oauth = { provider: this.provider, state: value, verifier, createdAt: Date.now() };
        req.session.save((error) => done(error, value));
    }
    verify(req, state, meta, done) {
        const pending = req.session.oauth;
        delete req.session.oauth;
        req.session.save((error) => {
            if (error) return done(error);
            if (!validState(pending, this.provider, state))
                return done(null, false, { message: "유효하지 않은 로그인 요청입니다." });
            done(null, pending.verifier || true);
        });
    }
}

function validState(pending, provider, state) {
    return pending && pending.provider === provider && typeof state === "string" &&
        state === pending.state && Date.now() - pending.createdAt <= 10 * 60 * 1000;
}

function verifyProfile(db, provider) {
    return async (accessToken, refreshToken, profile, done) => {
        try {
            if (!profile.id || !["string", "number"].includes(typeof profile.id))
                throw new Error("소셜 사용자 식별값 없음");
            // Preserve existing social IDs; ':' cannot be registered as a local ID.
            const id = `oauth:${provider}:${crypto.createHash("sha256").update(String(profile.id)).digest("hex")}`;
            let user = await db.User.findByPk(id);
            if (!user) {
                const nickname = profile.displayName || profile.username || "새 사용자";
                [user] = await db.User.findOrCreate({
                    where: { id },
                    defaults: {
                        name: Array.from(String(nickname).trim() || "새 사용자").slice(0, 40).join(""),
                        password: await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 12),
                        role: "USER",
                    },
                });
            }
            done(null, user);
        } catch (error) {
            done(error);
        }
    };
}

module.exports = { settings, StateStore, validState, verifyProfile };
