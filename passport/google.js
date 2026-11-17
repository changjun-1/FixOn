const { Strategy } = require("passport-google-oauth20");
const { settings, StateStore, verifyProfile } = require("./social");

module.exports = (passport, db) => {
    const config = settings("google");
    if (!config) return;
    const strategy = new Strategy({
        ...config, scope: ["openid", "profile"], state: true,
        pkce: "S256", store: new StateStore("google"),
    }, verifyProfile(db, "google"));
    strategy._oauth2._requestTimeout = 10000;
    passport.use(strategy);
};
