const { Strategy } = require("passport-kakao");
const { settings, StateStore, verifyProfile } = require("./social");

module.exports = (passport, db) => {
    const config = settings("kakao");
    if (!config) return;
    const strategy = new Strategy({ ...config, state: true, store: new StateStore("kakao") },
        verifyProfile(db, "kakao"));
    strategy._oauth2._requestTimeout = 10000;
    passport.use(strategy);
};
