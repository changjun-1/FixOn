const crypto = require("crypto");

async function loginSession(req, user) {
    await new Promise((resolve, reject) =>
        req.login(user, (error) => (error ? reject(error) : resolve())),
    );
    req.session.csrf = crypto.randomBytes(32).toString("hex");
    await new Promise((resolve, reject) =>
        req.session.save((error) => (error ? reject(error) : resolve())),
    );
}

module.exports = { loginSession };
