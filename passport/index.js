const passport = require("passport");
const local = require("./local");
const kakao = require("./kakao");
const google = require("./google");

module.exports = (db = require("../models"), instance = passport) => {
    instance.serializeUser((user, done) => done(null, user.id));
    instance.deserializeUser(async (id, done) => {
        try {
            const user = await db.User.findByPk(id, { attributes: ["id", "name", "role"] });
            done(null, user ? { id: user.id, name: user.name, role: user.role } : false);
        } catch (error) {
            done(error);
        }
    });
    local(instance, db);
    kakao(instance, db);
    google(instance, db);
    return instance;
};
