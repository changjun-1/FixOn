const { Strategy } = require("passport-local");
const bcrypt = require("bcrypt");

module.exports = (passport, db) => {
    passport.use(new Strategy({ usernameField: "id", passwordField: "password" },
        async (id, password, done) => {
            try {
                const user = await db.User.findByPk(id);
                if (!user || !user.password || !(await bcrypt.compare(password, user.password)))
                    return done(null, false, { message: "아이디 또는 비밀번호를 확인하세요." });
                done(null, user);
            } catch (error) {
                done(error);
            }
        }));
};
