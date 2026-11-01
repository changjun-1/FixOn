const crypto = require("crypto");
const login = (req, res, next) =>
  req.user ? next() : res.status(401).json({ error: "로그인이 필요합니다." });
const admin = (req, res, next) =>
  login(req, res, () =>
    req.user.role === "ADMIN"
      ? next()
      : res.status(403).json({ error: "관리자 권한이 필요합니다." }),
  );
function csrf(req, res, next) {
  if (!req.session.csrf)
    req.session.csrf = crypto.randomBytes(32).toString("hex");
  if (
    !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
    req.get("X-CSRF-Token") !== req.session.csrf
  )
    return res
      .status(403)
      .json({ error: "보안 토큰을 확인하고 다시 시도하세요." });
  res.locals.csrf = req.session.csrf;
  next();
}
module.exports = { login, admin, csrf };
