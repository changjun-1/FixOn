const { Op } = require("sequelize");
const wrap = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
function fail(code, message) {
  const e = new Error(message);
  e.status = code;
  throw e;
}
function text(v, name, max = 100, optional = false) {
  if (optional && v === undefined) return undefined;
  if (typeof v !== "string" || !v.trim() || v.trim().length > max)
    fail(400, `${name}: 1~${max}자 문자열이 필요합니다.`);
  return v.trim();
}
function id(v) {
  if (
    !/^\d+$/.test(String(v)) ||
    Number(v) < 1 ||
    !Number.isSafeInteger(Number(v))
  )
    fail(400, "올바른 ID가 필요합니다.");
  return Number(v);
}
function enumeration(v, values, label) {
  if (!values.includes(v))
    fail(400, `${label}: ${values.join(", ")} 중 선택하세요.`);
  return v;
}
function date(v) {
  if (typeof v !== "string" || !v.trim() || !Number.isFinite(Date.parse(v)))
    fail(400, "올바른 기한이 필요합니다.");
  return new Date(v);
}
function bool(v) {
  if (typeof v !== "boolean") fail(400, "활성 여부는 Boolean이어야 합니다.");
  return v;
}
async function get(Model, value, options = {}) {
  const row = await Model.findByPk(id(value), options);
  if (!row) fail(404, "대상을 찾을 수 없습니다.");
  return row;
}
function page(q) {
  const p = q.page === undefined ? 0 : Number(q.page),
    size = q.size === undefined ? 10 : Number(q.size);
  if (
    !Number.isInteger(p) ||
    p < 0 ||
    !Number.isInteger(size) ||
    size < 1 ||
    size > 100
  )
    fail(400, "page는 0 이상, size는 1~100 정수여야 합니다.");
  return { p, size, offset: p * size };
}
async function list(Model, req, res, where = {}, include = []) {
  const { p, size, offset } = page(req.query);
  const sorts = { newest: ["createdAt", "DESC"], oldest: ["createdAt", "ASC"] };
  const order = sorts[req.query.sort || "newest"];
  if (!order) fail(400, "sort는 newest 또는 oldest입니다.");
  const { rows, count } = await Model.findAndCountAll({
    where,
    include,
    distinct: true,
    limit: size,
    offset,
    order: [order, ["id", "DESC"]],
  });
  res.json({
    data: rows,
    pagination: {
      page: p,
      size,
      total: count,
      totalPages: Math.ceil(count / size),
    },
  });
}
function keyword(v) {
  return { [Op.like]: "%" + text(v, "keyword", 100) + "%" };
}
module.exports = {
  Op,
  wrap,
  fail,
  text,
  id,
  enumeration,
  date,
  bool,
  get,
  list,
  keyword,
};
