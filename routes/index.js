const { Router } = require("express");
module.exports = () => {
  const r = Router();
  r.get("/login", (req, res) => res.render("login.html", { title: "로그인" }));
  r.get("/register", (req, res) =>
    res.render("register.html", { title: "회원 가입", register: true }),
  );
  r.use((req, res, next) => (req.user ? next() : res.redirect("/login")));
  r.get("/", (req, res) => res.render("index.html", { title: "대시보드" }));
  for (const [url, title, page, restricted] of [
    ["reports", "고장 신고", "reports", false],
    ["facilities", "시설 관리", "facilities", false],
    ["categories", "고장 분류", "categories", false],
    ["work-orders", "정비 작업", "workOrders", true],
    ["users", "회원 목록", "users", true],
  ])
    r.get("/" + url, (req, res) => {
      if (restricted && req.user.role !== "ADMIN")
        return res
          .status(403)
          .render("error.html", {
            title: "접근 제한",
            message: "관리자 전용 화면입니다.",
          });
      res.render("manage.html", { title, page });
    });
  r.get("/reports/:id", (req, res) =>
    res.render("report-detail.html", { title: "신고 상세" }),
  );
  return r;
};
